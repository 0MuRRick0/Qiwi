from django.urls import path
from .views import RegisterView, LoginView, TokenRefreshView,  MeView, PrivilegesView
# from .views import LogoutView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    # path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('priveleges/', PrivilegesView.as_view(), name='rights'),
]