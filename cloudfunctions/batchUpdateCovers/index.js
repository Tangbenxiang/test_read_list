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

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const { limit = 5, skip = 0 } = event // 每次处理的数量和跳过数量

  try {
    // 1. 获取没有封面的书籍（cover字段为空或不存在）
    const queryResult = await db.collection('books')
      .where(_.or([
        { cover: '' },
        { cover: _.exists(false) }
      ]))
      .skip(skip)
      .limit(limit)
      .get()

    const books = queryResult.data

    if (books.length === 0) {
      return {
        success: true,
        message: '所有书籍都已更新封面',
        processed: 0,
        updated: 0,
        failed: 0,
        details: []
      }
    }

    console.log(`找到 ${books.length} 本需要更新封面的书籍`)

    const results = []
    let updatedCount = 0
    let failedCount = 0

    // 2. 逐本获取封面
    for (let i = 0; i < books.length; i++) {
      const book = books[i]
      console.log(`处理第 ${i + 1}/${books.length} 本: ${book.title}`)

      try {
        // 调用getBookCoverFromDouban云函数
        const coverResult = await cloud.callFunction({
          name: 'getBookCoverFromDouban',
          data: {
            bookId: book._id,
            title: book.title.replace(/《|》/g, ''),
            author: book.author
          }
        })

        if (coverResult.result.success) {
          updatedCount++
          results.push({
            bookId: book._id,
            title: book.title,
            success: true,
            coverUrl: coverResult.result.coverUrl,
            message: '封面更新成功'
          })
          console.log(`✓ ${book.title}: 封面更新成功`)
        } else {
          failedCount++
          results.push({
            bookId: book._id,
            title: book.title,
            success: false,
            message: coverResult.result.message || '获取封面失败'
          })
          console.log(`✗ ${book.title}: ${coverResult.result.message}`)
        }

        // 避免请求过快，添加延迟（豆瓣API频率限制）
        if (i < books.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒延迟
        }

      } catch (error) {
        failedCount++
        results.push({
          bookId: book._id,
          title: book.title,
          success: false,
          message: `云函数调用失败: ${error.message}`
        })
        console.error(`✗ ${book.title}: 云函数调用失败`, error)
      }
    }

    // 3. 返回处理结果
    const nextSkip = skip + books.length
    const hasMore = books.length === limit

    return {
      success: true,
      message: `批量更新完成，成功 ${updatedCount} 本，失败 ${failedCount} 本`,
      processed: books.length,
      updated: updatedCount,
      failed: failedCount,
      nextSkip: hasMore ? nextSkip : null,
      hasMore: hasMore,
      details: results,
      nextStep: hasMore ? `调用时设置 skip: ${nextSkip} 继续处理下一批` : '所有书籍已处理完成'
    }

  } catch (error) {
    console.error('批量更新封面失败:', error)
    return {
      success: false,
      error: error.message,
      message: '批量更新封面失败'
    }
  }
}