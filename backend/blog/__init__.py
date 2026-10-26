"""
墨韵博客 - 项目包初始化

在此处将 PyMySQL 注册为 MySQLdb，使 Django 的 MySQL 后端
（django.db.backends.mysql）可以直接使用纯 Python 驱动，
无需在目标机器上编译 mysqlclient。
"""

import pymysql

# 让 Django 认为当前加载的就是 MySQLdb
pymysql.install_as_MySQLdb()
