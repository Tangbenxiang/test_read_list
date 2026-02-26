#!/usr/bin/env node

/**
 * 本地获取书籍封面链接脚本
 *
 * 使用方法：
 * 1. 安装依赖：npm install axios
 * 2. 运行脚本：node scripts/fetch-book-covers.js
 *
 * 脚本会从importTestBooks.js中读取书籍数据，
 * 然后尝试从豆瓣、当当、京东等API获取封面链接，
 * 最后将结果保存到book-covers.json文件中。
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 豆瓣API秘钥列表（多个秘钥轮换使用以避免频率限制）
const DOUBAN_API_KEYS = [
  '0ac44ae016490db2204ce0a042db2916',
  '054022eaeae0b00e0fc068c0c0a2102a',
  '0ab215a8b1977939201640fa14c66bab'
];

// 当前使用的秘钥索引（轮换使用）
let currentApiKeyIndex = 0;

// 查询缓存（内存缓存，避免重复查询相同书籍）
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存时间

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 从豆瓣API获取书籍封面
 */
async function fetchFromDouban(query, apiKey) {
  // 确定要使用的API秘钥列表
  let apiKeysToTry = [];
  if (apiKey) {
    apiKeysToTry = [apiKey];
    console.log(`  使用指定的豆瓣API KEY: ${apiKey.substring(0, 8)}...`);
  } else if (DOUBAN_API_KEYS.length > 0) {
    apiKeysToTry = [];
    for (let i = 0; i < DOUBAN_API_KEYS.length; i++) {
      const index = (currentApiKeyIndex + i) % DOUBAN_API_KEYS.length;
      apiKeysToTry.push(DOUBAN_API_KEYS[index]);
    }
    console.log(`  使用豆瓣API KEY轮换，共 ${apiKeysToTry.length} 个KEY`);
  } else {
    console.log('  没有可用的豆瓣API KEY，使用公开接口（可能受限）');
  }

  // 遍历所有可用的API KEY
  for (let keyIndex = 0; keyIndex < apiKeysToTry.length; keyIndex++) {
    const currentKey = apiKeysToTry[keyIndex];
    const isLastKey = keyIndex === apiKeysToTry.length - 1;

    // 构建URL
    let searchUrl = `https://api.douban.com/v2/book/search?q=${encodeURIComponent(query)}&count=5`;
    if (currentKey) {
      searchUrl += `&apikey=${encodeURIComponent(currentKey)}`;
      console.log(`  尝试豆瓣API（KEY ${keyIndex + 1}/${apiKeysToTry.length}）: ${searchUrl.replace(currentKey, '***')}`);
    } else {
      console.log(`  尝试豆瓣API（无API KEY）: ${searchUrl}`);
    }

    // 重试配置（每个KEY最多重试2次）
    const maxRetries = 2;
    const retryDelay = 1000; // 1秒

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`    请求尝试 ${attempt}/${maxRetries}`);

        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 30000 // 增加到30秒，适应国内网络
        });

        const data = response.data;
        console.log(`    响应状态: ${response.status}, 结果数: ${data.books ? data.books.length : 0}`);

        if (data.books && data.books.length > 0) {
          const bestMatch = data.books[0];
          // 获取封面URL（优先使用large尺寸）
          let coverUrl = '';
          if (bestMatch.images && bestMatch.images.large) {
            coverUrl = bestMatch.images.large;
          } else if (bestMatch.image) {
            coverUrl = bestMatch.image;
          }

          if (coverUrl) {
            console.log(`    豆瓣API找到封面: ${coverUrl}`);

            // 更新当前KEY索引（轮换到下一个）
            if (!apiKey && DOUBAN_API_KEYS.length > 0) {
              const usedKeyIndex = DOUBAN_API_KEYS.indexOf(currentKey);
              if (usedKeyIndex >= 0) {
                currentApiKeyIndex = (usedKeyIndex + 1) % DOUBAN_API_KEYS.length;
                console.log(`    更新API KEY索引: ${usedKeyIndex} -> ${currentApiKeyIndex}`);
              }
            }

            return { success: true, coverUrl };
          } else {
            console.log('    豆瓣API找到书籍但无封面');
            return { success: false, error: '找到书籍信息但无封面图片' };
          }
        } else {
          console.log('    豆瓣API未找到相关书籍');
          return { success: false, error: '未找到相关书籍信息' };
        }

      } catch (error) {
        console.error(`    请求尝试 ${attempt} 失败: ${error.message}`);

        // 检查错误类型
        let shouldTryNextKey = false;
        if (error.response) {
          const status = error.response.status;
          console.error(`    响应状态: ${status}`);

          if (status === 429) {
            // 频率限制，尝试下一个KEY
            console.log('    频率限制（429），将尝试下一个API KEY');
            shouldTryNextKey = true;
          } else if (status === 403 || status === 401) {
            // 权限错误，如果是特定的KEY，尝试下一个
            if (currentKey && !apiKey) {
              console.log(`    API KEY可能无效（${status}），将尝试下一个KEY`);
              shouldTryNextKey = true;
            }
          }
        }

        // 如果是最后一次尝试且应该尝试下一个KEY，并且不是最后一个KEY
        if (attempt === maxRetries && shouldTryNextKey && !isLastKey) {
          console.log(`    当前API KEY失败，尝试下一个KEY...`);
          break; // 跳出重试循环，继续下一个KEY
        }

        // 如果是最后一次尝试且不应该尝试下一个KEY，或者已经是最后一个KEY
        if (attempt === maxRetries && (!shouldTryNextKey || isLastKey)) {
          let errorMessage = `豆瓣API请求失败: ${error.message || '未知错误'}`;

          if (error.response) {
            const status = error.response.status;
            if (status === 403 || status === 401) {
              errorMessage = '豆瓣API访问被拒绝';
              if (!currentKey) {
                errorMessage += '（未提供API KEY）';
              } else if (apiKeysToTry.length === 1) {
                errorMessage += '（提供的API KEY可能无效）';
              } else {
                errorMessage += '（所有API KEY都无效）';
              }
            } else if (status === 429) {
              errorMessage = '豆瓣API请求过于频繁（所有KEY都达到限制），请稍后重试';
            } else if (status >= 500) {
              errorMessage = '豆瓣API服务器错误，请稍后重试';
            }
          } else if (error.code === 'ECONNABORTED') {
            errorMessage = '豆瓣API请求超时，请检查网络连接';
          }

          return {
            success: false,
            error: errorMessage
          };
        }

        // 不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          console.log(`    等待 ${retryDelay}ms 后重试...`);
          await delay(retryDelay);
        }
      }
    }
  }

  // 如果没有API KEY且apiKeysToTry为空
  if (apiKeysToTry.length === 0) {
    // 尝试无API KEY的请求
    const searchUrl = `https://api.douban.com/v2/book/search?q=${encodeURIComponent(query)}&count=5`;
    console.log(`  尝试豆瓣API（无API KEY）: ${searchUrl}`);

    try {
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      const data = response.data;
      console.log(`    响应状态: ${response.status}, 结果数: ${data.books ? data.books.length : 0}`);

      if (data.books && data.books.length > 0) {
        const bestMatch = data.books[0];
        let coverUrl = '';
        if (bestMatch.images && bestMatch.images.large) {
          coverUrl = bestMatch.images.large;
        } else if (bestMatch.image) {
          coverUrl = bestMatch.image;
        }

        if (coverUrl) {
          console.log(`    豆瓣API找到封面: ${coverUrl}`);
          return { success: true, coverUrl };
        }
      }
    } catch (error) {
      console.error(`    无API KEY请求失败: ${error.message}`);
    }
  }

  return {
    success: false,
    error: '豆瓣API请求失败'
  };
}

/**
 * 从当当网获取书籍封面（通过搜索页面）
 */
async function fetchFromDangdang(query) {
  // 当当网搜索URL
  const searchUrl = `http://search.dangdang.com/?key=${encodeURIComponent(query)}&act=input`;
  console.log(`  尝试当当网搜索: ${searchUrl}`);

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
    });

    const html = response.data;
    console.log(`    响应状态: ${response.status}, 内容长度: ${html.length}`);

    // 简单的HTML解析，查找图书封面
    const coverRegex = /<img[^>]*?data-original="([^"]*?)"[^>]*?alt="[^"]*?"[^>]*?>/gi;

    let match;
    let coverUrl = '';

    // 首先尝试data-original属性（懒加载图片）
    match = coverRegex.exec(html);
    if (match && match[1]) {
      coverUrl = match[1];
      // 确保URL完整
      if (coverUrl && !coverUrl.startsWith('http')) {
        coverUrl = 'http:' + coverUrl;
      }
      console.log(`    从data-original找到封面: ${coverUrl}`);
    }

    // 如果没有找到，尝试普通img标签
    if (!coverUrl) {
      const imgRegex = /<img[^>]*?class="pic[^"]*?"[^>]*?src="([^"]*?)"[^>]*?>/gi;
      match = imgRegex.exec(html);
      if (match && match[1]) {
        coverUrl = match[1];
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = 'http:' + coverUrl;
        }
        console.log(`    从class="pic"找到封面: ${coverUrl}`);
      }
    }

    // 尝试查找商品列表
    if (!coverUrl) {
      const liRegex = /<li[^>]*?class="line[^"]*?"[^>]*?>[\s\S]*?<img[^>]*?src="([^"]*?)"[^>]*?>/gi;
      match = liRegex.exec(html);
      if (match && match[1]) {
        coverUrl = match[1];
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = 'http:' + coverUrl;
        }
        console.log(`    从商品列表找到封面: ${coverUrl}`);
      }
    }

    if (coverUrl) {
      // 清理URL，移除可能的大小限制参数
      coverUrl = coverUrl.replace(/\.jpg_.*\.jpg$/, '.jpg');
      coverUrl = coverUrl.replace(/\.jpg@.*$/, '.jpg');
      coverUrl = coverUrl.replace(/_b\.jpg$/, '.jpg');

      console.log(`    当当网找到封面: ${coverUrl}`);
      return { success: true, coverUrl };
    } else {
      console.log('    当当网搜索成功但未找到封面图片');
      return { success: false, error: '搜索成功但未找到封面图片' };
    }

  } catch (error) {
    console.error(`    当当网API请求失败: ${error.message}`);
    if (error.response) {
      console.error(`      响应状态: ${error.response.status}`);
    }
    return {
      success: false,
      error: `当当网请求失败: ${error.message || '未知错误'}`
    };
  }
}

/**
 * 从京东获取书籍封面（通过搜索页面）
 */
async function fetchFromJD(query) {
  // 京东搜索URL
  const searchUrl = `https://search.jd.com/Search?keyword=${encodeURIComponent(query)}&enc=utf-8`;
  console.log(`  尝试京东搜索: ${searchUrl}`);

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
    });

    const html = response.data;
    console.log(`    响应状态: ${response.status}, 内容长度: ${html.length}`);

    // 京东的图书封面通常有特定的class
    let coverUrl = '';

    // 方法1：查找data-lazy-img属性（懒加载）
    const lazyImgRegex = /<img[^>]*?data-lazy-img="([^"]*?)"[^>]*?>/gi;
    let match = lazyImgRegex.exec(html);
    if (match && match[1]) {
      coverUrl = match[1];
      if (coverUrl && !coverUrl.startsWith('http')) {
        coverUrl = 'https:' + coverUrl;
      }
      console.log(`    从data-lazy-img找到封面: ${coverUrl}`);
    }

    // 方法2：查找图书商品列表中的图片
    if (!coverUrl) {
      const bookImgRegex = /<img[^>]*?class="[^"]*?p-img[^"]*?"[^>]*?src="([^"]*?)"[^>]*?>/gi;
      match = bookImgRegex.exec(html);
      if (match && match[1]) {
        coverUrl = match[1];
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = 'https:' + coverUrl;
        }
        console.log(`    从p-img class找到封面: ${coverUrl}`);
      }
    }

    // 方法3：查找商品列表图片
    if (!coverUrl) {
      const productRegex = /<div[^>]*?class="p-img"[^>]*?>[\s\S]*?<img[^>]*?src="([^"]*?)"[^>]*?>/gi;
      match = productRegex.exec(html);
      if (match && match[1]) {
        coverUrl = match[1];
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = 'https:' + coverUrl;
        }
        console.log(`    从p-img div找到封面: ${coverUrl}`);
      }
    }

    if (coverUrl) {
      // 清理URL
      coverUrl = coverUrl.replace(/\.avif.*$/, '.avif');
      coverUrl = coverUrl.replace(/\.jpg.*$/, '.jpg');
      coverUrl = coverUrl.replace(/\.png.*$/, '.png');
      coverUrl = coverUrl.replace(/\/s\d+x\d+_/, '/'); // 移除尺寸限制

      console.log(`    京东找到封面: ${coverUrl}`);
      return { success: true, coverUrl };
    } else {
      console.log('    京东搜索成功但未找到封面图片');
      return { success: false, error: '搜索成功但未找到封面图片' };
    }

  } catch (error) {
    console.error(`    京东API请求失败: ${error.message}`);
    if (error.response) {
      console.error(`      响应状态: ${error.response.status}`);
    }
    return {
      success: false,
      error: `京东请求失败: ${error.message || '未知错误'}`
    };
  }
}

/**
 * 获取书籍封面 - 主函数
 */
async function fetchBookCover(book, index, total) {
  const { serial, title, author } = book;
  console.log(`\n[${index + 1}/${total}] 处理书籍: 《${title}》 - ${author} (序号: ${serial})`);

  // 构建搜索查询
  const searchQuery = `${title} ${author || ''}`.trim();
  console.log(`  搜索查询: "${searchQuery}"`);

  // 检查缓存
  const cacheKey = `cover:${searchQuery}`;
  const cachedResult = queryCache.get(cacheKey);

  if (cachedResult) {
    const cacheAge = Date.now() - cachedResult.timestamp;
    if (cacheAge < CACHE_TTL) {
      console.log(`  使用缓存结果，缓存年龄: ${Math.round(cacheAge / 1000)}秒`);

      if (cachedResult.success && cachedResult.coverUrl) {
        return {
          ...book,
          cover: cachedResult.coverUrl,
          source: cachedResult.source || 'cache',
          success: true,
          message: `封面获取成功（来源：缓存，原始来源：${cachedResult.source || '未知'}）`
        };
      } else {
        console.log('  缓存中存在失败记录，跳过缓存');
      }
    } else {
      console.log(`  缓存已过期（${Math.round(cacheAge / 1000)}秒），重新查询`);
      queryCache.delete(cacheKey);
    }
  }

  let result = null;
  let source = '';

  // 定义API尝试顺序
  const apiAttempts = [
    { name: 'douban', fn: () => fetchFromDouban(searchQuery) },
    { name: 'dangdang', fn: () => fetchFromDangdang(searchQuery) },
    { name: 'jd', fn: () => fetchFromJD(searchQuery) }
  ];

  // 按顺序尝试各个API
  for (const api of apiAttempts) {
    console.log(`  尝试${api.name} API...`);
    result = await api.fn();
    source = api.name;

    if (result.success) {
      console.log(`  ${api.name} API 成功`);
      break;
    } else {
      console.log(`  ${api.name} API 失败: ${result.error}`);
    }
  }

  // 如果任一API成功
  if (result.success && result.coverUrl) {
    console.log(`  成功从${source}获取封面: ${result.coverUrl}`);

    // 更新缓存
    queryCache.set(cacheKey, {
      success: true,
      coverUrl: result.coverUrl,
      source: source,
      timestamp: Date.now()
    });

    return {
      ...book,
      cover: result.coverUrl,
      source: source,
      success: true,
      message: `封面获取成功（来源：${source}）`
    };
  } else {
    // 所有API都失败，缓存失败结果（短期避免重复查询）
    queryCache.set(cacheKey, {
      success: false,
      error: result.error,
      timestamp: Date.now()
    });

    const errorMsg = result.error || '未找到封面图片';
    console.log(`  所有API都失败: ${errorMsg}`);

    return {
      ...book,
      cover: '',
      source: '',
      success: false,
      error: errorMsg,
      message: `获取封面失败: ${errorMsg}`
    };
  }
}

/**
 * 从importTestBooks.js中读取书籍数据
 */
function getTestBooks() {
  try {
    // 直接读取importTestBooks.js文件，提取测试数据
    const importTestBooksPath = path.join(__dirname, '..', 'cloudfunctions', 'importTestBooks', 'index.js');
    const content = fs.readFileSync(importTestBooksPath, 'utf8');

    // 使用简单的正则表达式提取testBooks数组
    // 注意：这是一个简单的实现，对于复杂情况可能需要更健壮的解析
    const match = content.match(/const testBooks = (\[[\s\S]*?\]);/);
    if (match) {
      // 使用eval来解析数组（注意安全风险，但这里是可信的本地文件）
      const testBooks = eval(`(${match[1]})`);
      console.log(`从importTestBooks.js读取到 ${testBooks.length} 本书籍`);
      return testBooks;
    } else {
      console.error('无法从importTestBooks.js中提取testBooks数据');
      return [];
    }
  } catch (error) {
    console.error('读取测试书籍数据失败:', error);
    return [];
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 开始获取书籍封面链接 ===\n');

  // 1. 获取书籍数据
  const books = getTestBooks();
  if (books.length === 0) {
    console.log('没有找到书籍数据，退出程序');
    return;
  }

  // 2. 处理每本书籍
  const results = [];
  const requestDelay = 2000; // 请求间延迟（毫秒），避免频率限制

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const result = await fetchBookCover(book, i, books.length);
    results.push(result);

    // 请求间延迟（避免频率限制）
    if (i < books.length - 1) {
      console.log(`  等待 ${requestDelay}ms 后处理下一本...`);
      await delay(requestDelay);
    }
  }

  // 3. 统计结果
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n=== 处理完成 ===');
  console.log(`总计: ${results.length} 本书`);
  console.log(`成功: ${successful} 本`);
  console.log(`失败: ${failed} 本`);
  console.log(`成功率: ${((successful / results.length) * 100).toFixed(1)}%`);

  // 4. 保存结果到文件
  const outputFile = path.join(__dirname, 'book-covers.json');
  const outputData = {
    timestamp: new Date().toISOString(),
    total: results.length,
    successful,
    failed,
    books: results.map(book => ({
      serial: book.serial,
      title: book.title,
      author: book.author,
      cover: book.cover || '',
      source: book.source || '',
      success: book.success || false,
      error: book.error || '',
      message: book.message || ''
    }))
  };

  fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`\n结果已保存到: ${outputFile}`);

  // 5. 生成用于更新的SQL/JSON文件
  generateUpdateFiles(results);
}

/**
 * 生成用于更新数据库的文件
 */
function generateUpdateFiles(results) {
  // 生成包含封面URL的书籍数据（用于重新导入）
  const booksWithCovers = results
    .filter(book => book.success && book.cover)
    .map(book => ({
      serial: book.serial,
      title: book.title,
      type: book.type || '',
      author: book.author,
      description: book.description || '',
      gradeLevel: book.gradeLevel || '',
      purchased: book.purchased || false,
      read: book.read || false,
      intensiveRead: book.intensiveRead || false,
      cover: book.cover,
      source: book.source || ''
    }));

  // 生成更新数据文件
  const updateDataFile = path.join(__dirname, 'books-with-covers.json');
  fs.writeFileSync(updateDataFile, JSON.stringify(booksWithCovers, null, 2), 'utf8');
  console.log(`更新数据已保存到: ${updateDataFile}`);
  console.log(`包含封面的书籍数量: ${booksWithCovers.length}`);

  // 生成用于云函数更新的数据
  const updatePayload = booksWithCovers.map(book => ({
    serial: book.serial,
    cover: book.cover,
    source: book.source
  }));

  const updatePayloadFile = path.join(__dirname, 'update-covers-payload.json');
  fs.writeFileSync(updatePayloadFile, JSON.stringify(updatePayload, null, 2), 'utf8');
  console.log(`更新载荷已保存到: ${updatePayloadFile}`);

  // 生成失败记录
  const failedBooks = results
    .filter(book => !book.success || !book.cover)
    .map(book => ({
      serial: book.serial,
      title: book.title,
      author: book.author,
      error: book.error || '未找到封面'
    }));

  if (failedBooks.length > 0) {
    const failedFile = path.join(__dirname, 'failed-covers.json');
    fs.writeFileSync(failedFile, JSON.stringify(failedBooks, null, 2), 'utf8');
    console.log(`失败记录已保存到: ${failedFile}`);
  }

  console.log('\n=== 下一步操作 ===');
  console.log('1. 检查 book-covers.json 中的结果');
  console.log('2. 使用 books-with-covers.json 中的数据重新导入书籍');
  console.log('3. 或使用 update-covers-payload.json 中的数据批量更新现有书籍的封面');
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('程序执行出错:', error);
    process.exit(1);
  });
}

module.exports = { fetchBookCover, getTestBooks };