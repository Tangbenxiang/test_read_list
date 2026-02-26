// cloudfunctions/batchUpdateCovers/index.js
const cloud = require('wx-server-sdk')

// 云函数初始化
try {
  cloud.init({})
} catch (error) {
  console.error('云函数初始化失败:', error)
  // 如果简单初始化失败，尝试使用固定环境
  try {
    cloud.init({
      env: 'cloudbase-4gnknimqbe0440c9'
    })
  } catch (fixedError) {
    console.error('固定环境初始化也失败:', fixedError)
  }
}

// 批量更新配置
const BATCH_CONFIG = {
  maxRetries: 2, // 每个书籍最大重试次数
  retryDelay: 2000, // 重试延迟（毫秒）
  requestDelay: 1000, // 请求之间延迟（避免频率限制）
  maxConcurrent: 1 // 最大并发请求数（设置为1避免频率限制）
}

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const { limit = 5, skip = 0 } = event // 每次处理的数量和跳过数量

  try {
    // 1. 获取没有封面的书籍（cover字段为空或不存在）
    console.log(`开始批量更新封面，limit: ${limit}, skip: ${skip}`)
    const queryResult = await db.collection('books')
      .where(_.or([
        { cover: '' },
        { cover: _.exists(false) }
      ]))
      .skip(skip)
      .limit(limit)
      .get()

    const books = queryResult.data
    console.log(`查询到 ${books.length} 本书籍`)

    if (books.length === 0) {
      return {
        success: true,
        message: '所有书籍都已更新封面',
        processed: 0,
        updated: 0,
        failed: 0,
        details: [],
        nextSkip: null,
        hasMore: false
      }
    }

    console.log(`开始处理 ${books.length} 本需要更新封面的书籍`)

    const results = []
    let updatedCount = 0
    let failedCount = 0
    const startTime = Date.now()

    // 2. 逐本获取封面（带重试机制）
    for (let i = 0; i < books.length; i++) {
      const book = books[i]
      console.log(`\n--- 处理第 ${i + 1}/${books.length} 本: 《${book.title}》 ---`)

      let lastError = null
      let success = false
      let coverUrl = ''
      let finalMessage = ''

      // 重试循环
      for (let retry = 0; retry <= BATCH_CONFIG.maxRetries; retry++) {
        const isRetry = retry > 0
        if (isRetry) {
          console.log(`  重试 ${retry}/${BATCH_CONFIG.maxRetries}...`)
          await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.retryDelay))
        }

        try {
          // 调用getBookCoverFromDouban云函数
          console.log(`  调用云函数 getBookCoverFromDouban...`)
          const coverResult = await cloud.callFunction({
            name: 'getBookCoverFromDouban',
            data: {
              bookId: book._id,
              title: book.title.replace(/《|》/g, ''),
              author: book.author
            }
          })

          if (coverResult.result && coverResult.result.success) {
            success = true
            coverUrl = coverResult.result.coverUrl
            finalMessage = coverResult.result.message || '封面更新成功'
            console.log(`  ✓ 成功: ${finalMessage}`)
            break // 成功，跳出重试循环
          } else {
            lastError = coverResult.result ? coverResult.result.message : '云函数返回失败'
            console.log(`  ✗ 失败: ${lastError}`)

            // 如果是特定的错误，可能不需要重试
            if (lastError.includes('未找到相关书籍') || lastError.includes('找到书籍信息但无封面图片')) {
              console.log(`  书籍可能不存在或无封面，跳过重试`)
              break
            }
          }
        } catch (error) {
          lastError = `云函数调用失败: ${error.message}`
          console.error(`  ✗ 异常: ${error.message}`)

          // 如果是网络错误，继续重试
          if (error.message.includes('timeout') || error.message.includes('网络') || error.code === 'ECONNABORTED') {
            console.log(`  网络错误，将重试`)
            continue
          } else {
            // 其他错误，不重试
            break
          }
        }
      }

      if (success) {
        updatedCount++
        results.push({
          bookId: book._id,
          title: book.title,
          success: true,
          coverUrl: coverUrl,
          message: finalMessage,
          retries: 0 // 这里可以记录重试次数
        })
        console.log(`✓ 《${book.title}》: 封面更新成功`)
      } else {
        failedCount++
        results.push({
          bookId: book._id,
          title: book.title,
          success: false,
          message: lastError || '获取封面失败',
          retries: BATCH_CONFIG.maxRetries
        })
        console.log(`✗ 《${book.title}》: ${lastError}`)
      }

      // 请求间延迟（避免频率限制）
      if (i < books.length - 1) {
        console.log(`  等待 ${BATCH_CONFIG.requestDelay}ms 后处理下一本...`)
        await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.requestDelay))
      }
    }

    // 3. 返回处理结果
    const endTime = Date.now()
    const totalTime = (endTime - startTime) / 1000
    const nextSkip = skip + books.length
    const hasMore = books.length === limit

    const summary = {
      success: true,
      message: `批量更新完成，成功 ${updatedCount} 本，失败 ${failedCount} 本，耗时 ${totalTime.toFixed(1)} 秒`,
      processed: books.length,
      updated: updatedCount,
      failed: failedCount,
      totalTime: totalTime,
      nextSkip: hasMore ? nextSkip : null,
      hasMore: hasMore,
      details: results,
      nextStep: hasMore ? `调用时设置 skip: ${nextSkip} 继续处理下一批` : '所有书籍已处理完成',
      stats: {
        successRate: books.length > 0 ? ((updatedCount / books.length) * 100).toFixed(1) + '%' : '0%',
        avgTimePerBook: totalTime / books.length
      }
    }

    console.log(`\n=== 批量更新摘要 ===`)
    console.log(`处理时间: ${totalTime.toFixed(1)} 秒`)
    console.log(`成功率: ${summary.stats.successRate}`)
    console.log(`下一批skip: ${summary.nextSkip || '无'}`)
    console.log(`是否有更多: ${summary.hasMore}`)

    return summary

  } catch (error) {
    console.error('批量更新封面失败（全局错误）:', error)

    let errorMessage = error.message
    if (error.errCode) {
      errorMessage = `${error.errCode}: ${errorMessage}`
    }

    return {
      success: false,
      error: errorMessage,
      message: '批量更新封面失败',
      processed: 0,
      updated: 0,
      failed: 0,
      details: []
    }
  }
}