from rest_framework.pagination import PageNumberPagination


class FlexiblePageNumberPagination(PageNumberPagination):
    """
    Pagination class that allows clients to specify page size via query parameter.

    Clients can override the default page size by passing ?page_size=N
    The page size is limited by max_page_size to prevent abuse.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
