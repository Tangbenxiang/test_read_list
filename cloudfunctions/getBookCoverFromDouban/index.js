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

// 使用axios进行HTTP请求（确保package.json中已包含axios依赖）
const axios = require('axios')

// 豆瓣API秘钥列表（多个秘钥轮换使用以避免频率限制）
const DOUBAN_API_KEYS = [
  '0ac44ae016490db2204ce0a042db2916',
  '054022eaeae0b00e0fc068c0c0a2102a',
  '0ab215a8b1977939201640fa14c66bab'
]

// 当前使用的秘钥索引（轮换使用）
let currentApiKeyIndex = 0

// 查询缓存（内存缓存，避免单次调用中重复查询相同书籍）
const queryCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存时间

/**
 * 从豆瓣API获取书籍封面
 * @param {string} query 搜索查询（书名 + 作者）
 * @param {string} apiKey 豆瓣API KEY（可选，如果提供则使用指定的KEY）
 * @returns {Promise<{success: boolean, coverUrl?: string, error?: string}>}
 */
async function fetchFromDouban(query, apiKey) {
  // 确定要使用的API秘钥列表
  let apiKeysToTry = []
  if (apiKey) {
    // 如果传入了单个API KEY，只使用它
    apiKeysToTry = [apiKey]
    console.log(`使用指定的豆瓣API KEY: ${apiKey.substring(0, 8)}...`)
  } else if (DOUBAN_API_KEYS.length > 0) {
    // 使用配置的多个API KEY，从当前索引开始轮换
    apiKeysToTry = []
    for (let i = 0; i < DOUBAN_API_KEYS.length; i++) {
      const index = (currentApiKeyIndex + i) % DOUBAN_API_KEYS.length
      apiKeysToTry.push(DOUBAN_API_KEYS[index])
    }
    console.log(`使用豆瓣API KEY轮换，共 ${apiKeysToTry.length} 个KEY`)
  } else {
    // 没有API KEY，使用公开接口
    console.log('没有可用的豆瓣API KEY，使用公开接口（可能受限）')
  }

  // 遍历所有可用的API KEY
  for (let keyIndex = 0; keyIndex < apiKeysToTry.length; keyIndex++) {
    const currentKey = apiKeysToTry[keyIndex]
    const isLastKey = keyIndex === apiKeysToTry.length - 1

    // 构建URL
    let searchUrl = `https://api.douban.com/v2/book/search?q=${encodeURIComponent(query)}&count=5`
    if (currentKey) {
      searchUrl += `&apikey=${encodeURIComponent(currentKey)}`
      console.log(`尝试豆瓣API（KEY ${keyIndex + 1}/${apiKeysToTry.length}）: ${searchUrl.replace(currentKey, '***')}`)
    } else {
      console.log(`尝试豆瓣API（无API KEY）: ${searchUrl}`)
    }

    // 重试配置（每个KEY最多重试2次）
    const maxRetries = 2
    const retryDelay = 1000 // 1秒

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`  请求尝试 ${attempt}/${maxRetries}`)

        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 30000 // 增加到30秒，适应国内网络
        })

        const data = response.data
        console.log(`  响应状态: ${response.status}, 结果数: ${data.books ? data.books.length : 0}`)

        if (data.books && data.books.length > 0) {
          const bestMatch = data.books[0]
          // 获取封面URL（优先使用large尺寸）
          let coverUrl = ''
          if (bestMatch.images && bestMatch.images.large) {
            coverUrl = bestMatch.images.large
          } else if (bestMatch.image) {
            coverUrl = bestMatch.image
          }

          if (coverUrl) {
            console.log(`豆瓣API找到封面: ${coverUrl}`)

            // 更新当前KEY索引（轮换到下一个）
            if (!apiKey && DOUBAN_API_KEYS.length > 0) {
              const usedKeyIndex = DOUBAN_API_KEYS.indexOf(currentKey)
              if (usedKeyIndex >= 0) {
                currentApiKeyIndex = (usedKeyIndex + 1) % DOUBAN_API_KEYS.length
                console.log(`更新API KEY索引: ${usedKeyIndex} -> ${currentApiKeyIndex}`)
              }
            }

            return { success: true, coverUrl }
          } else {
            console.log('豆瓣API找到书籍但无封面')
            return { success: false, error: '找到书籍信息但无封面图片' }
          }
        } else {
          console.log('豆瓣API未找到相关书籍')
          return { success: false, error: '未找到相关书籍信息' }
        }

      } catch (error) {
        console.error(`  请求尝试 ${attempt} 失败: ${error.message}`)

        // 检查错误类型
        let shouldTryNextKey = false
        if (error.response) {
          const status = error.response.status
          console.error(`  响应状态: ${status}`)

          if (status === 429) {
            // 频率限制，尝试下一个KEY
            console.log('  频率限制（429），将尝试下一个API KEY')
            shouldTryNextKey = true
          } else if (status === 403 || status === 401) {
            // 权限错误，如果是特定的KEY，尝试下一个
            if (currentKey && !apiKey) {
              console.log(`  API KEY可能无效（${status}），将尝试下一个KEY`)
              shouldTryNextKey = true
            }
          }
        }

        // 如果是最后一次尝试且应该尝试下一个KEY，并且不是最后一个KEY
        if (attempt === maxRetries && shouldTryNextKey && !isLastKey) {
          console.log(`当前API KEY失败，尝试下一个KEY...`)
          break // 跳出重试循环，继续下一个KEY
        }

        // 如果是最后一次尝试且不应该尝试下一个KEY，或者已经是最后一个KEY
        if (attempt === maxRetries && (!shouldTryNextKey || isLastKey)) {
          let errorMessage = `豆瓣API请求失败: ${error.message || '未知错误'}`

          if (error.response) {
            const status = error.response.status
            if (status === 403 || status === 401) {
              errorMessage = '豆瓣API访问被拒绝'
              if (!currentKey) {
                errorMessage += '（未提供API KEY）'
              } else if (apiKeysToTry.length === 1) {
                errorMessage += '（提供的API KEY可能无效）'
              } else {
                errorMessage += '（所有API KEY都无效）'
              }
            } else if (status === 429) {
              errorMessage = '豆瓣API请求过于频繁（所有KEY都达到限制），请稍后重试'
            } else if (status >= 500) {
              errorMessage = '豆瓣API服务器错误，请稍后重试'
            }
          } else if (error.code === 'ECONNABORTED') {
            errorMessage = '豆瓣API请求超时，请检查网络连接'
          }

          return {
            success: false,
            error: errorMessage
          }
        }

        // 不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          console.log(`  等待 ${retryDelay}ms 后重试...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }
  }

  // 如果没有API KEY且apiKeysToTry为空
  if (apiKeysToTry.length === 0) {
    // 尝试无API KEY的请求
    const searchUrl = `https://api.douban.com/v2/book/search?q=${encodeURIComponent(query)}&count=5`
    console.log(`尝试豆瓣API（无API KEY）: ${searchUrl}`)

    try {
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      })

      const data = response.data
      console.log(`响应状态: ${response.status}, 结果数: ${data.books ? data.books.length : 0}`)

      if (data.books && data.books.length > 0) {
        const bestMatch = data.books[0]
        let coverUrl = ''
        if (bestMatch.images && bestMatch.images.large) {
          coverUrl = bestMatch.images.large
        } else if (bestMatch.image) {
          coverUrl = bestMatch.image
        }

        if (coverUrl) {
          console.log(`豆瓣API找到封面: ${coverUrl}`)
          return { success: true, coverUrl }
        }
      }
    } catch (error) {
      console.error(`无API KEY请求失败: ${error.message}`)
    }
  }

  return {
    success: false,
    error: '豆瓣API请求失败'
  }
}

/**
 * 从当当网获取书籍封面（通过搜索页面）
 * @param {string} query 搜索查询（书名 + 作者）
 * @returns {Promise<{success: boolean, coverUrl?: string, error?: string}>}
 */
async function fetchFromDangdang(query) {
  // 当当网搜索URL
  const searchUrl = `http://search.dangdang.com/?key=${encodeURIComponent(query)}&act=input`
  console.log(`尝试当当网搜索: ${searchUrl}`)

  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      timeout: 30000,
      // 当当网可能需要处理重定向
      maxRedirects: 5
    })

    const html = response.data
    console.log(`当当网响应状态: ${response.status}, 内容长度: ${html.length}`)

    // 简单的HTML解析，查找图书封面
    // 当当网的商品图片通常有特定的class或属性
    const coverRegex = /<img[^>]*?data-original="([^"]*?)"[^>]*?alt="[^"]*?"[^>]*?>/gi
    // 或者查找商品列表中的图片
    const productRegex = /<a[^>]*?ddclick="product\([^)]*\)"[^>]*?>[\s\S]*?<img[^>]*?src="([^"]*?)"[^>]*?>/gi

    let match
    let coverUrl = ''

    // 首先尝试data-original属性（懒加载图片）
    match = coverRegex.exec(html)
    if (match && match[1]) {
      coverUrl = match[1]
      // 确保URL完整
      if (coverUrl && !coverUrl.startsWith('http')) {
        coverUrl = 'http:' + coverUrl
      }
      console.log(`从data-original找到封面: ${coverUrl}`)
    }

    // 如果没有找到，尝试普通img标签
    if (!coverUrl) {
      const imgRegex = /<img[^>]*?class="pic[^"]*?"[^>]*?src="([^"]*?)"[^>]*?>/gi
      match = imgRegex.exec(html)
      if (match && match[1]) {
        coverUrl = match[1]
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = 'http:' + coverUrl
        }
        console.log(`从class="pic"找到封面: ${coverUrl}`)
      }
    }

    // 尝试查找商品列表
    if (!coverUrl) {
      const liRegex = /<li[^>]*?class="line[^"]*?"[^>]*?>[\s\S]*?<img[^>]*?src="([^"]*?)"[^>]*?>/gi
      match = liRegex.exec(html)
      if (match && match[1]) {
        coverUrl = match[1]
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = 'http:' + coverUrl
        }
        console.log(`从商品列表找到封面: ${coverUrl}`)
      }
    }

    if (coverUrl) {
      // 清理URL，移除可能的大小限制参数
      coverUrl = coverUrl.replace(/\.jpg_.*\.jpg$/, '.jpg')
      coverUrl = coverUrl.replace(/\.jpg@.*$/, '.jpg')
      coverUrl = coverUrl.replace(/_b\.jpg$/, '.jpg')

      console.log(`当当网找到封面: ${coverUrl}`)
      return { success: true, coverUrl }
    } else {
      console.log('当当网搜索成功但未找到封面图片')
      // 可以尝试其他匹配模式或返回页面片段用于调试
      return { success: false, error: '搜索成功但未找到封面图片' }
    }

  } catch (error) {
    console.error(`当当网API请求失败: ${error.message}`)
    if (error.response) {
      console.error(`响应状态: ${error.response.status}`)
    }
    return {
      success: false,
      error: `当当网请求失败: ${error.message || '未知错误'}`
    }
  }
}

/**
 * 从京东获取书籍封面（通过搜索页面）
 * @param {string} query 搜索查询（书名 + 作者）
 * @returns {Promise<{success: boolean, coverUrl?: string, error?: string}>}
 */
async function fetchFromJD(query) {
  // 京东搜索URL
  const searchUrl = `https://search.jd.com/Search?keyword=${encodeURIComponent(query)}&enc=utf-8`
  console.log(`尝试京东搜索: ${searchUrl}`)

  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Referer': 'https://www.jd.com/'
      },
      timeout: 30000,
      maxRedirects: 5
    })

    const html = response.data
    console.log(`京东响应状态: ${response.status}, 内容长度: ${html.length}`)

    // 京东的图书封面通常有特定的class
    // 尝试查找商品图片
    let coverUrl = ''

    // 方法1：查找data-lazy-img属性（懒加载）
    const lazyImgRegex = /<img[^>]*?data-lazy-img="([^"]*?)"[^>]*?>/gi
    let match = lazyImgRegex.exec(html)
    if (match && match[1]) {
      coverUrl = match[1]
      if (coverUrl && !coverUrl.startsWith('http')) {
        coverUrl = 'https:' + coverUrl
      }
      console.log(`从data-lazy-img找到封面: ${coverUrl}`)
    }

    // 方法2：查找图书商品列表中的图片
    if (!coverUrl) {
      const bookImgRegex = /<img[^>]*?class="[^"]*?p-img[^"]*?"[^>]*?src="([^"]*?)"[^>]*?>/gi
      match = bookImgRegex.exec(html)
      if (match && match[1]) {
        coverUrl = match[1]
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = 'https:' + coverUrl
        }
        console.log(`从p-img class找到封面: ${coverUrl}`)
      }
    }

    // 方法3：查找商品列表图片
    if (!coverUrl) {
      const productRegex = /<div[^>]*?class="p-img"[^>]*?>[\s\S]*?<img[^>]*?src="([^"]*?)"[^>]*?>/gi
      match = productRegex.exec(html)
      if (match && match[1]) {
        coverUrl = match[1]
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = 'https:' + coverUrl
        }
        console.log(`从p-img div找到封面: ${coverUrl}`)
      }
    }

    // 方法4：查找所有img标签，尝试找到图书相关的
    if (!coverUrl) {
      const allImgRegex = /<img[^>]*?src="([^"]*?)"[^>]*?>/gi
      let allMatches = []
      while ((match = allImgRegex.exec(html)) !== null) {
        const imgUrl = match[1]
        // 过滤掉一些常见的不相关图片
        if (imgUrl &&
            !imgUrl.includes('logo') &&
            !imgUrl.includes('icon') &&
            !imgUrl.includes('sprites') &&
            !imgUrl.includes('loading') &&
            (imgUrl.includes('n1') || imgUrl.includes('n0') || imgUrl.includes('360buyimg'))) {
          allMatches.push(imgUrl)
        }
      }
      if (allMatches.length > 0) {
        coverUrl = allMatches[0]
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = 'https:' + coverUrl
        }
        console.log(`从通用img找到封面: ${coverUrl}`)
      }
    }

    if (coverUrl) {
      // 清理URL
      coverUrl = coverUrl.replace(/\.avif.*$/, '.avif')
      coverUrl = coverUrl.replace(/\.jpg.*$/, '.jpg')
      coverUrl = coverUrl.replace(/\.png.*$/, '.png')
      coverUrl = coverUrl.replace(/\/s\d+x\d+_/, '/') // 移除尺寸限制

      console.log(`京东找到封面: ${coverUrl}`)
      return { success: true, coverUrl }
    } else {
      console.log('京东搜索成功但未找到封面图片')
      return { success: false, error: '搜索成功但未找到封面图片' }
    }

  } catch (error) {
    console.error(`京东API请求失败: ${error.message}`)
    if (error.response) {
      console.error(`响应状态: ${error.response.status}`)
    }
    return {
      success: false,
      error: `京东请求失败: ${error.message || '未知错误'}`
    }
  }
}

/**
 * 从Open Library API获取书籍封面
 * @param {string} query 搜索查询（书名 + 作者）
 * @returns {Promise<{success: boolean, coverUrl?: string, error?: string}>}
 */
async function fetchFromOpenLibrary(query) {
  const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`
  console.log(`尝试Open Library API: ${searchUrl}`)

  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000 // 增加到30秒，适应国内网络
    })

    const data = response.data
    console.log(`Open Library API响应状态: ${response.status}, 结果数: ${data.docs ? data.docs.length : 0}`)

    if (data.docs && data.docs.length > 0) {
      const bestMatch = data.docs[0]
      // Open Library使用cover_i字段构建封面URL
      if (bestMatch.cover_i) {
        const coverUrl = `https://covers.openlibrary.org/b/id/${bestMatch.cover_i}-L.jpg`
        console.log(`Open Library找到封面: ${coverUrl}`)
        return { success: true, coverUrl }
      } else {
        console.log('Open Library找到书籍但无封面ID')
        return { success: false, error: '找到书籍信息但无封面图片' }
      }
    } else {
      console.log('Open Library未找到相关书籍')
      return { success: false, error: '未找到相关书籍信息' }
    }
  } catch (error) {
    console.error(`Open Library API请求失败: ${error.message}`)
    if (error.response) {
      console.error(`响应状态: ${error.response.status}`)
    }
    return {
      success: false,
      error: `Open Library API请求失败: ${error.message || '未知错误'}`
    }
  }
}

exports.main = async (event, context) => {
  const db = cloud.database()
  const { bookId, title, author, doubanApiKey } = event

  if (!bookId || !title) {
    return {
      success: false,
      error: '缺少必要参数：bookId和title',
      message: '缺少必要参数：bookId和title'
    }
  }

  // 获取豆瓣API KEY：优先使用事件参数，其次使用环境变量
  const apiKey = doubanApiKey || process.env.DOUBAN_API_KEY
  if (apiKey) {
    console.log('已配置豆瓣API KEY')
  } else {
    console.log('未配置豆瓣API KEY，使用公开接口（可能受限）')
  }

  try {
    console.log(`开始获取书籍封面: ${title} - ${author}`)

    // 构建搜索查询
    const searchQuery = `${title} ${author || ''}`.trim()
    console.log(`搜索查询: "${searchQuery}"`)

    // 检查缓存
    const cacheKey = `cover:${searchQuery}`
    const cachedResult = queryCache.get(cacheKey)

    if (cachedResult) {
      const cacheAge = Date.now() - cachedResult.timestamp
      if (cacheAge < CACHE_TTL) {
        console.log(`使用缓存结果，缓存年龄: ${Math.round(cacheAge/1000)}秒`)

        // 使用缓存的封面URL更新数据库
        if (cachedResult.success && cachedResult.coverUrl) {
          try {
            await db.collection('books').doc(bookId).update({
              data: {
                cover: cachedResult.coverUrl,
                updateTime: db.serverDate(),
                coverSource: cachedResult.source || 'cache'
              }
            })
            console.log('数据库更新成功（使用缓存）')
          } catch (dbError) {
            console.error('数据库更新失败:', dbError)
          }

          return {
            success: true,
            coverUrl: cachedResult.coverUrl,
            source: cachedResult.source || 'cache',
            message: `封面获取成功（来源：缓存，原始来源：${cachedResult.source || '未知'}）`
          }
        } else {
          console.log('缓存中存在失败记录，跳过缓存')
        }
      } else {
        console.log(`缓存已过期（${Math.round(cacheAge/1000)}秒），重新查询`)
        queryCache.delete(cacheKey)
      }
    }

    let result = null
    let source = ''

    // 定义API尝试顺序
    const apiAttempts = [
      { name: 'douban', fn: () => fetchFromDouban(searchQuery, apiKey) },
      { name: 'dangdang', fn: () => fetchFromDangdang(searchQuery) },
      { name: 'jd', fn: () => fetchFromJD(searchQuery) },
      { name: 'openlibrary', fn: () => fetchFromOpenLibrary(searchQuery) }
    ]

    // 按顺序尝试各个API
    for (const api of apiAttempts) {
      console.log(`尝试${api.name} API...`)
      result = await api.fn()
      source = api.name

      if (result.success) {
        console.log(`${api.name} API 成功`)
        break
      } else {
        console.log(`${api.name} API 失败: ${result.error}`)
      }
    }

    // 如果任一API成功
    if (result.success && result.coverUrl) {
      console.log(`成功从${source}获取封面: ${result.coverUrl}`)

      // 更新缓存
      queryCache.set(cacheKey, {
        success: true,
        coverUrl: result.coverUrl,
        source: source,
        timestamp: Date.now()
      })
      console.log(`已更新缓存，缓存大小: ${queryCache.size}`)

      // 更新数据库中的cover字段
      try {
        await db.collection('books').doc(bookId).update({
          data: {
            cover: result.coverUrl,
            updateTime: db.serverDate(),
            coverSource: source
          }
        })
        console.log('数据库更新成功')
      } catch (dbError) {
        console.error('数据库更新失败:', dbError)
        // 即使数据库更新失败，也返回封面URL
      }

      return {
        success: true,
        coverUrl: result.coverUrl,
        source: source,
        message: `封面获取成功（来源：${source}）`
      }
    } else {
      // 所有API都失败，缓存失败结果（短期避免重复查询）
      queryCache.set(cacheKey, {
        success: false,
        error: result.error,
        timestamp: Date.now()
      })

      const errorMsg = result.error || '未找到封面图片'
      console.log(`所有API都失败: ${errorMsg}`)
      return {
        success: false,
        error: errorMsg,
        message: `获取封面失败: ${errorMsg}`
      }
    }

  } catch (error) {
    console.error('获取封面失败（全局捕获）:', error)

    // 返回详细的错误信息
    return {
      success: false,
      error: error.message || '未知错误',
      message: '获取封面失败，请检查网络或稍后重试'
    }
  }
}