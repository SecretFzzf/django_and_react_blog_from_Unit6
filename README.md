# 墨韵博客 · MoYun Blog

> 以代码为骨，以文字为韵。

一个前后端分离的中文博客系统，基于 **Django 4.2 + Django REST Framework + MySQL 8** 与
**React 18 + Tailwind CSS + DaisyUI + Framer Motion** 构建。

本次重构在原开源项目基础上完成了数据库迁移、全站中文化、深色玻璃拟态视觉改造、
动效体系升级与账号安全体系补全。

---

## 目录结构

```
react-django-blog-app-main/
├── backend/                      Django 后端
│   ├── blog/                     项目配置
│   │   ├── __init__.py           PyMySQL 注册为 MySQLdb
│   │   ├── settings.py           MySQL / 中文时区 / SimpleJWT / DRF 分页
│   │   └── urls.py               根路由
│   ├── api/                      业务应用
│   │   ├── models.py             Profile / Tag / Blog / Favorite / Comment
│   │   ├── serializers.py        序列化器（含注册 Bug 修复）
│   │   ├── views.py              全部接口
│   │   ├── urls.py               接口路由表
│   │   ├── admin.py              中文管理后台
│   │   ├── pagination.py         全局分页器
│   │   ├── exceptions.py         全局中文异常处理
│   │   ├── forms.py              后台表单
│   │   ├── migrations/           数据库迁移
│   │   └── management/commands/
│   │       └── seed_demo.py      示例数据填充命令
│   ├── requirements.txt          依赖清单
│   └── smoke_test.py             端到端接口冒烟测试（103 项断言）
│
└── frontend/                     React 前端
    ├── .env                      接口地址与站点信息
    ├── tailwind.config.js        深色色板 / 发光阴影 / 动画配置
    ├── public/index.html         中文站点元信息
    └── src/
        ├── App.js                路由表 + AnimatePresence 页面切换
        ├── index.css             设计系统（毛玻璃 / 排版 / 滚动条）
        ├── context/AuthContext.js   登录态与令牌自动续期
        ├── services/
        │   ├── api.js            axios 实例 + 401 自动刷新重放
        │   └── GetContent.js     全部接口封装
        ├── utils/
        │   ├── format.js         工具函数
        │   └── PrivateRoutes.js  受保护路由
        ├── components/           16 个通用组件
        └── pages/                16 个页面
```

---

## 快速开始

### 1. 准备数据库（推荐使用 Docker 一键启动）

项目默认配置连接本地端口 `3307`（密码 `123`，数据库名 `blog_db`），支持挂载项目根目录下的 `db_data` 目录以实现数据持久化：

```bash
# Windows PowerShell 启动命令（挂载本地 db_data 目录）
docker run -d `
  --name moyun-mysql `
  -p 3307:3306 `
  -e MYSQL_ROOT_PASSWORD=123 `
  -e MYSQL_DATABASE=blog_db `
  -v "${PWD}/db_data:/var/lib/mysql" `
  mysql:8.0 `
  --character-set-server=utf8mb4 `
  --collation-server=utf8mb4_unicode_ci
```
> macOS / Linux 用户请将换行符 `` ` `` 替换为 `\`。

若使用本机已有的 MySQL 服务，请手动建库并确保端口为 `3307`：
```sql
CREATE DATABASE blog_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

数据库连接配置位于 `backend/blog/settings.py`，默认值：

| 项 | 值 | 说明 |
| --- | --- | --- |
| ENGINE | `django.db.backends.mysql` | 使用 PyMySQL 适配驱动 |
| NAME | `blog_db` | 默认数据库名 |
| USER | `root` | 用户名 |
| PASSWORD | `123` | 密码 |
| HOST | `127.0.0.1` | 主机地址 |
| PORT | `3307` | 避免与主机默认 3306 冲突 |
| CHARSET | `utf8mb4` | 完整 Unicode 支持 |

### 2. 启动后端

```bash
cd backend

# 创建并激活虚拟环境
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt

python manage.py migrate           # 建表迁移
python manage.py createsuperuser   # 创建后台管理员（可选）
python manage.py seed_demo         # 填充示例数据（可选）

python manage.py runserver
```

后端地址：`http://127.0.0.1:8000`
管理后台：`http://127.0.0.1:8000/admin/`

### 3. 启动前端

```bash
cd frontend
npm install
npm start
```

前端地址：`http://localhost:3000`

### 4. 示例账号（执行过 `seed_demo` 后可用）

| 用户名 | 密码 | 昵称 |
| --- | --- | --- |
| `demo_moyun` | `Demo@2026` | 墨韵 |
| `demo_qingfeng` | `Demo@2026` | 清风 |
| `demo_lanyu` | `Demo@2026` | 澜屿 |

清除示例数据：

```bash
python manage.py seed_demo --flush
```

---

## 接口一览

所有接口以 `/api/` 为前缀。

### 认证

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/token/` | 登录，返回 access + refresh + 用户资料 |
| POST | `/api/token/refresh/` | 刷新令牌（自动轮换） |
| POST | `/api/auth/logout/` | 退出登录（refresh 加入黑名单） |
| POST | `/api/register/` | 注册 |

### 密码

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/password/change/` | 已登录用户修改密码 |
| POST | `/api/auth/password/reset/` | 申请重置链接 |
| POST | `/api/auth/password/reset/verify/` | 校验重置链接有效性 |
| POST | `/api/auth/password/reset/confirm/` | 提交新密码 |

### 用户

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/profile/me/` | 当前用户资料 |
| PATCH | `/api/profile/update/` | 修改资料（含头像上传） |
| GET | `/api/profile/<id>/` | 指定用户公开资料 |

### 文章

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/blogs/` | 列表，支持 `category` `tag` `author` `search` `ordering` `page` `page_size` |
| GET | `/api/blogs/<id>/` | 详情（自动累加浏览量） |
| GET | `/api/blogs/hot/` | 热门榜单 `?limit=` |
| GET | `/api/blogs/archive/` | 归档分组 `?year=&month=&category=&tag=&search=` |
| GET | `/api/blogs/categories/` | 分类列表（含文章数） |
| GET | `/api/blogs/my/` | 我的文章 `?status=published\|draft` |
| POST | `/api/blogs/create/` | 发布文章 |
| PUT/PATCH | `/api/blogs/<id>/update/` | 更新文章（仅作者） |
| DELETE | `/api/blogs/<id>/delete/` | 删除文章（仅作者） |
| POST | `/api/blogs/<id>/like/` | 点赞 / 取消点赞 |
| POST | `/api/blogs/<id>/favorite/` | 收藏 / 取消收藏 |

### 标签 / 收藏 / 评论 / 统计

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/tags/` | 标签云（含文章数与最大热度） |
| GET | `/api/favorites/` | 我的收藏 |
| GET | `/api/blogs/<id>/comments/` | 评论列表 |
| POST | `/api/comments/create/` | 发表评论 |
| DELETE | `/api/comments/<id>/delete/` | 删除评论（仅作者） |
| GET | `/api/stats/` | 站点统计 |

---

## 本次重构要点

### 后端

- **数据库切换 MySQL**：`utf8mb4` 字符集，`PyMySQL` 注册为 `MySQLdb`，无需编译 `mysqlclient`
- **全站中文化**：`LANGUAGE_CODE='zh-hans'`、`TIME_ZONE='Asia/Shanghai'`；
  分类改为 16 个中文分类；401/403/404/校验错误统一翻译为自然中文
- **修复原项目缺陷**：
  - `ProfileSerializer.create()` 同时创建 `User` 与 `Profile` 两张表的严重注册 Bug
  - `blog/urls.py` 引用了 Django 4 已移除的 `django.conf.urls.include`
  - `MEDIA_URL` 缺少前导斜杠导致媒体文件 404
  - `reading_time()` 用 `len(content.split())` 统计中文恒为 0，改为按语种加权计算
  - 中文标题下 `AutoSlugField` 生成空 slug 导致唯一约束冲突，改为自研 slug 生成
  - 文章的更新 / 删除、评论删除**完全没有归属校验**（任意登录用户可改删他人内容）
  - 点赞、发文、评论信任前端传入的 `user` / `author` 字段，可伪造身份
  - `author_photo` 等属性在作者被删除（`SET_NULL`）时抛 `AttributeError`
  - 浏览量使用 `views += 1` 存在并发竞态，改为 `F()` 原子自增
- **新增能力**：`Tag` 多标签、`Favorite` 收藏、`views` 浏览量、`is_top` 置顶、
  归档分组、热门榜单、标签云、站点统计、密码重置全流程
- **管理后台**：全中文，列表展示 / 筛选 / 搜索 / 批量操作全部增强

### 前端

- **依赖**：`framer-motion`、`react-markdown`、`remark-gfm`、`highlight.js`、`dompurify`
- **视觉**：深色玻璃拟态（`#0B0F17` 底色 + `backdrop-blur` + `border-white/10`）、
  紫蓝青渐变强调色、统一 `rounded-2xl`、发光阴影、鼠标跟随光斑、卡片 3D 倾斜
- **动效**：`<AnimatePresence mode="wait">` 页面切换、Stagger 列表渐入、
  按钮 Hover 微放大 / 点击下压、点赞心跳粒子、收藏光晕扩散、骨架屏过渡
- **Navbar**：滚动响应毛玻璃、动画下划线、用户头像下拉菜单、移动端侧滑抽屉
- **Markdown**：自研编辑器（工具栏 + 实时预览 + 快捷键）+
  `react-markdown` 渲染 + 语法高亮 + 代码块一键复制；同时兼容历史富文本 HTML 内容
- **账号体系**：注册密码强度检测、确认密码校验、头像上传预览；
  `/forgot-password`、`/reset-password/:uid/:token`、`/settings` 修改密码
- **页面**：首页 Hero + 实时搜索 + 分类胶囊 + 分页；文章详情沉浸式排版 + 悬浮操作栏；
  归档时间线；标签墙；收藏夹；个人仪表盘；资料编辑（实时预览）

---

## 环境变量

`frontend/.env`：

```env
REACT_APP_BASE_URL=http://127.0.0.1:8000
REACT_APP_SITE_NAME=墨韵博客
REACT_APP_SITE_SLOGAN=以代码为骨，以文字为韵
```

后端可选环境变量：

| 变量 | 说明 |
| --- | --- |
| `DJANGO_SECRET_KEY` | 生产环境密钥 |
| `DJANGO_DEBUG` | `False` 关闭调试 |
| `EMAIL_HOST_USER` | 邮箱账号，配置后启用真实邮件发送 |
| `EMAIL_HOST_PASSWORD` | 邮箱授权码 |
| `EMAIL_HOST` | SMTP 服务器，默认 `smtp.qq.com` |
| `FRONTEND_URL` | 重置密码链接的前端地址 |

> 未配置邮箱时使用控制台后端，重置链接会打印在后端终端，
> 开发模式下同时通过接口返回，方便直接调试。

---

## 测试

```bash
cd backend
python smoke_test.py
```

覆盖注册 / 登录 / 令牌轮换 / 发帖 / 筛选 / 搜索 / 分页 / 浏览量 /
点赞 / 收藏 / 评论 / 归档 / 标签 / 热门 / 资料修改 / 改密码 /
令牌重置 / 越权保护 / 异常中文化，共 **103 项断言**。

```bash
cd frontend
npm run build     # 生产构建校验
```

---

## 上线前检查清单

- [ ] `DJANGO_DEBUG=False`
- [ ] `DJANGO_SECRET_KEY` 通过环境变量注入
- [ ] `ALLOWED_HOSTS` 收敛为实际域名
- [ ] `CORS_ALLOW_ALL_ORIGINS` 改为白名单
- [ ] 配置 SMTP 邮箱账号
- [ ] 媒体文件交由 Nginx 托管，关闭 `DEBUG` 下的静态路由
- [ ] `python manage.py collectstatic`
- [ ] 数据库账号使用最小权限用户，而非 `root`

---

## License

继承原项目许可（详见 `LICENSE`）。
