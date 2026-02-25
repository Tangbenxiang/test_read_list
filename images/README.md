# 图片资源说明

## 需要的图片

### 1. 图标类
- `tab-home.png` / `tab-home-active.png` - 首页标签栏图标
- `tab-books.png` / `tab-books-active.png` - 书籍标签栏图标
- `search-icon.png` - 搜索图标
- `filter-icon.png` - 筛选图标
- `share-icon.png` - 分享图标

### 2. 状态图标
- `purchased-icon.png` - 已购买图标
- `read-icon.png` - 已阅读图标
- `intensive-icon.png` - 已精读图标
- `purchased-small.png` - 小号已购买图标
- `read-small.png` - 小号已阅读图标
- `intensive-small.png` - 小号已精读图标

### 3. 装饰元素
- `snowflake.png` - 雪花图标
- `header-bg.png` - 头部背景图片（可选）
- `share-cover.jpg` - 分享封面图片

### 4. 爱莎公主元素
- `elsa-1.png` - 爱莎公主图标（一至二年级）
- `elsa-2.png` - 爱莎公主图标（三至四年级）
- `elsa-3.png` - 爱莎公主图标（五至六年级）

## 图片要求
- 格式：PNG（透明背景）或 JPG
- 尺寸：建议使用2倍图（@2x）适配高清屏
- 颜色：蓝色系，符合冰雪主题
- 风格：可爱、圆润，适合儿童

## 临时解决方案
当前使用Emoji字符作为占位符，如需使用图片请替换：
1. 准备上述图片文件
2. 将图片放入本目录
3. 在代码中替换Emoji为对应的图片路径

## 推荐资源
1. [IconFont](https://www.iconfont.cn/) - 阿里巴巴矢量图标库
2. [Flaticon](https://www.flaticon.com/) - 免费矢量图标
3. [Undraw](https://undraw.co/) - 开源插画

## 图片优化建议
1. 使用TinyPNG压缩图片
2. 适当使用雪碧图（Sprite）减少请求
3. 重要图片添加loading状态
4. 实现图片懒加载