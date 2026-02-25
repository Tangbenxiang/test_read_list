// cloudfunctions/importTestBooks/index.js
const cloud = require('wx-server-sdk')

// 云函数初始化 - 使用最简单的初始化方式
// 在云函数中，可以不带参数初始化，会自动使用当前环境
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

// 测试书籍数据 - 根据用户提供的12本书整理
const testBooks = [
  {
    serial: 1,
    title: "窗边的小豆豆",
    type: "儿童文学小说",
    author: "黑柳彻子",
    description: "黑柳彻子的自传体作品，记录她在巴学园的学生时代。书中通过生动细节和温暖笔触，强调尊重孩子个性、启发式教育的重要性，适合家长和孩子共读。",
    gradeLevel: "一至二年级",
    purchased: true,
    read: true,
    intensiveRead: true,
    cover: ""
  },
  {
    serial: 2,
    title: "一年级的小蜜瓜",
    type: "校园生活",
    author: "商晓娜",
    description: "以小学一年级为背景的校园故事集，围绕小蜜瓜的日常展开，语言贴近儿童生活，适合一年级学生阅读和亲子共读。",
    gradeLevel: "一至二年级",
    purchased: true,
    read: true,
    intensiveRead: false,
    cover: ""
  },
  {
    serial: 3,
    title: "月光下的肚肚狼",
    type: "童话",
    author: "冰波",
    description: "童话作品，讲述肚肚狼在月圆之夜化身为王子的奇幻经历，通过善良与友谊等主题表达成长与希望。",
    gradeLevel: "一至二年级",
    purchased: true,
    read: true,
    intensiveRead: false,
    cover: ""
  },
  {
    serial: 4,
    title: "上学是一场最大的冒险",
    type: "绘本",
    author: "（德）奥利弗·舍茨",
    description: "德国儿童绘本，讲述小主人公上学的冒险与日常，画面与故事充满童趣，强调友谊和适应新环境。",
    gradeLevel: "一至二年级",
    purchased: true,
    read: true,
    intensiveRead: false,
    cover: ""
  },
  {
    serial: 5,
    title: "没头脑和不高兴",
    type: "儿童文学",
    author: "任溶溶",
    description: "著名儿童文学作家任溶溶的经典作品，塑造了“没头脑”和“不高兴”两个具有代表性的儿童形象，通过幽默故事反映儿童天真与社会观察。",
    gradeLevel: "一至二年级",
    purchased: true,
    read: true,
    intensiveRead: false,
    cover: ""
  },
  {
    serial: 6,
    title: "在星星的背面漫步",
    type: "儿童散文/成长观察",
    author: "姜二嫚",
    description: "“05 后” 少年诗人姜二嫚的首部散文集，收录 60 余篇散文与短文，配本人手绘插图；以诗意文字记录日常观察、旅途见闻与亲情点滴，教孩子做生活的观察者，清醒独立地成长，入选小学生寒假推荐书目。",
    gradeLevel: "三至四年级",
    purchased: false,
    read: false,
    intensiveRead: false,
    cover: ""
  },
  {
    serial: 7,
    title: "寻梦敦煌原创童话书系・夜叉守护神",
    type: "奇幻童话 / 敦煌文化启蒙",
    author: "龙向梅",
    description: "立春之夜女孩苏果意外唤醒莫高窟妖怪，在面冷心热的夜叉帕戈丢引导下，闯入壁画秘境找金缕衣、封印鬼母；融合飞天、九色鹿等敦煌元素，入选 2026 小学生寒假推荐书目，培养勇气与文化认同。",
    gradeLevel: "三至四年级",
    purchased: false,
    read: false,
    intensiveRead: false,
    cover: ""
  },
  {
    serial: 8,
    title: "大侦探福尔摩斯",
    type: "侦探小说（青少版）",
    author: "阿瑟·柯南·道尔 (原著) / 厉河 (改编)",
    description: "这套书是福尔摩斯探案集的青少版改编，通常由厉河等进行改编和绘制。它保留了原著的经典案件和核心推理过程，同时简化了语言，增加了生动有趣的插画，并将角色动物化（如福尔摩斯是瘦高的狗，华生是温和的猫），使之更符合儿童的阅读习惯和理解能力，是引导孩子接触世界名著侦探小说的优秀桥梁书。",
    gradeLevel: "三至四年级",
    purchased: true,
    read: true,
    intensiveRead: true,
    cover: ""
  },
  {
    serial: 9,
    title: "哈利波特与魔法石",
    type: "奇幻小说",
    author: "J.K.罗琳",
    description: "从小寄养在姨父家的哈利·波特，在十一岁生日时得知自己是一名巫师，并收到了霍格沃茨魔法学校的入学通知书。在学校里，他结识了赫敏和罗恩等好友，学习了神奇的魔法，并逐渐揭开自己身世的秘密。他们发现学校内藏着一块能让人长生不老的魔法石，并决心保护它不被伏地魔偷走。这是魔法世界大门的开启。",
    gradeLevel: "五至六年级",
    purchased: true,
    read: true,
    intensiveRead: true,
    cover: ""
  },
  {
    serial: 10,
    title: "哈利波特与密室",
    type: "奇幻小说",
    author: "J.K.罗琳",
    description: "哈利在霍格沃茨的第二年充满了新的挑战。学校墙壁上出现了恐怖的血字警告：\"密室已经被打开……\"随后学生们接连被石化，而哈利被认为是斯莱特林继承人的嫌疑对象。他与罗恩、赫敏一起，调查密室的传说，寻找隐藏在城堡深处的秘密，并与少年伏地魔的记忆——汤姆·里德尔的日记，进行了一场惊心动魄的较量。",
    gradeLevel: "五至六年级",
    purchased: true,
    read: true,
    intensiveRead: true,
    cover: ""
  },
  {
    serial: 11,
    title: "哈利波特与阿兹卡班的囚徒",
    type: "奇幻小说",
    author: "J.K.罗琳",
    description: "哈利在霍格沃茨的第三年，恶名昭著的杀人犯小天狼星布莱克从看守森严的阿兹卡班监狱逃出，据说他的目标是哈利。与此同时，霍格沃茨迎来了新的黑魔法防御术老师卢平教授，以及被称为\"摄魂怪\"的恐怖守卫。哈利在这一年中学会了守护神咒，并揭开了关于他父母死亡的真相，以及小天狼星与他教父身份的惊人秘密。",
    gradeLevel: "五至六年级",
    purchased: true,
    read: true,
    intensiveRead: true,
    cover: ""
  },
  {
    serial: 12,
    title: "哈利波特与火焰杯",
    type: "奇幻小说",
    author: "J.K.罗琳",
    description: "哈利在霍格沃茨的第四年，学校举办了三强争霸赛。尽管年龄不足，哈利的名字却被火焰杯选中，被迫代表霍格沃茨与另外两所魔法学校的勇士一同参赛，面对龙、人鱼等重重挑战。然而，这一切都是一个巨大的阴谋，比赛的终点等待他的是复活了的伏地魔。这是整个系列的转折点，黑暗时代来临。",
    gradeLevel: "五至六年级",
    purchased: true,
    read: true,
    intensiveRead: true,
    cover: ""
  }
]

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command

  try {
    // 检查当前已有多少书籍
    const countResult = await db.collection('books').count()
    const existingCount = countResult.total

    // 检查是否已有测试数据（通过serial 1-12判断）
    const existingTestBooks = await db.collection('books')
      .where({
        serial: _.gte(1).and(_.lte(12))
      })
      .count()

    const existingTestCount = existingTestBooks.total

    let importResults = {
      total: testBooks.length,
      imported: 0,
      skipped: 0,
      existingTotal: existingCount,
      existingTestCount: existingTestCount,
      details: []
    }

    // 如果有测试数据已存在，可以选择跳过或更新
    // 这里我们选择跳过已存在的serial，只添加不存在的
    for (const book of testBooks) {
      try {
        // 检查是否已存在相同serial的书籍
        const existingBook = await db.collection('books')
          .where({
            serial: book.serial
          })
          .get()

        if (existingBook.data.length > 0) {
          // 已存在，跳过
          importResults.skipped++
          importResults.details.push({
            serial: book.serial,
            title: book.title,
            status: 'skipped',
            reason: '已存在相同序号的书籍'
          })
        } else {
          // 不存在，添加
          const addResult = await db.collection('books').add({
            data: {
              ...book,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })

          importResults.imported++
          importResults.details.push({
            serial: book.serial,
            title: book.title,
            status: 'imported',
            bookId: addResult._id
          })
        }
      } catch (bookError) {
        console.error(`导入书籍 ${book.serial} - ${book.title} 失败:`, bookError)
        importResults.details.push({
          serial: book.serial,
          title: book.title,
          status: 'failed',
          error: bookError.message
        })
      }
    }

    // 重新计数
    const newCountResult = await db.collection('books').count()

    return {
      success: true,
      message: `书籍导入完成。共处理 ${importResults.total} 本书，成功导入 ${importResults.imported} 本，跳过 ${importResults.skipped} 本。`,
      data: {
        ...importResults,
        finalTotal: newCountResult.total,
        newAdded: newCountResult.total - existingCount
      }
    }

  } catch (error) {
    console.error('导入书籍失败:', error)
    return {
      success: false,
      error: error.message,
      message: '导入书籍失败，请检查云环境配置和数据库权限'
    }
  }
}