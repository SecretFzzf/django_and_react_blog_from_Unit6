"""
墨韵博客 - 全局分页器

统一的返回结构（前端只需解析 results / count / next / previous）：

    {
        "count": 42,
        "total_pages": 6,
        "current_page": 1,
        "page_size": 8,
        "next": "http://127.0.0.1:8000/api/blogs/?page=2",
        "previous": null,
        "results": [ ... ]
    }
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    page_size = 8
    page_size_query_param = 'page_size'
    max_page_size = 50

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })
