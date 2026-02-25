// cloudfunctions/getBookCoverFromDouban/index.js
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
  const { bookId, title, author } = event

  if (!bookId || !title) {
    return {
      success: false,
      error: '缺少必要参数：bookId和title'
    }
  }

  try {
    console.log(`开始获取书籍封面: ${title} - ${author}`)

    // 豆瓣API查询URL
    const searchQuery = encodeURIComponent(`${title} ${author}`.trim())
    const searchUrl = `https://api.douban.com/v2/book/search?q=${searchQuery}&count=5`

    console.log(`豆瓣API请求URL: ${searchUrl}`)

    // 使用云函数HTTP请求（云开发环境支持）
    const result = await cloud.callFunction({
      name: 'httpRequest',
      data: {
        url: searchUrl,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    }).catch(async () => {
      // 如果httpRequest云函数不存在，使用原生HTTP请求
      try {
        const axios = require('axios')
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        })
        return { result: response.data }
      } catch (error) {
        throw new Error(`HTTP请求失败: ${error.message}`)
      }
    })

    const data = result.result

    if (data.books && data.books.length > 0) {
      // 找到最佳匹配的书籍
      let bestMatch = data.books[0]

      // 如果有作者信息，尝试匹配作者
      if (author) {
        const authorLower = author.toLowerCase()
        const matchedBook = data.books.find(book =>
          book.author && book.author.toLowerCase().includes(authorLower)
        )
        if (matchedBook) {
          bestMatch = matchedBook
        }
      }

      // 获取封面URL（优先使用large尺寸）
      let coverUrl = ''
      if (bestMatch.images && bestMatch.images.large) {
        coverUrl = bestMatch.images.large
      } else if (bestMatch.image) {
        coverUrl = bestMatch.image
      }

      if (coverUrl) {
        console.log(`找到封面URL: ${coverUrl}`)

        // 更新数据库中的cover字段
        await db.collection('books').doc(bookId).update({
          data: {
            cover: coverUrl,
            updateTime: db.serverDate()
          }
        })

        return {
          success: true,
          coverUrl: coverUrl,
          bookInfo: {
            title: bestMatch.title,
            author: bestMatch.author,
            publisher: bestMatch.publisher,
            summary: bestMatch.summary
          },
          message: '封面获取成功'
        }
      } else {
        return {
          success: false,
          message: '找到书籍信息但无封面图片'
        }
      }
    } else {
      return {
        success: false,
        message: '未找到相关书籍信息'
      }
    }

  } catch (error) {
    console.error('获取封面失败:', error)

    // 返回详细的错误信息
    return {
      success: false,
      error: error.message || '未知错误',
      message: '获取封面失败，请检查网络或稍后重试'
    }
  }
}