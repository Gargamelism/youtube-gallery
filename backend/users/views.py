import requests
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.utils import timezone
from django.conf import settings
from .models import User, UserChannel, UserVideo
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    UserSerializer,
    UserChannelSerializer,
    UserVideoSerializer
)


def validate_recaptcha_v3(token, action, threshold=0.5):
    """
    Validate reCAPTCHA v3 token
    
    Args:
        token: The reCAPTCHA token from the frontend
        action: The action that was specified when executing reCAPTCHA (e.g., 'login', 'register')
        threshold: Minimum score to consider valid (0.0 to 1.0, default 0.5)
    
    Returns:
        bool: True if validation passes, False otherwise
    """
    data = {
        'secret': settings.CAPTCHA_PRIVATE_KEY,
        'response': token
    }
    
    try:
        response = requests.post('https://www.google.com/recaptcha/api/siteverify', data=data, timeout=10)
        result = response.json()
        
        # Check if request was successful
        if not result.get('success', False):
            return False
        
        # Check if the action matches (optional but recommended)
        if result.get('action') != action:
            return False
        
        # Check if the score meets the threshold
        score = result.get('score', 0.0)
        return score >= threshold
        
    except Exception as e:
        # Log the error in production
        print(f"reCAPTCHA validation error: {e}")
        return False


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    captcha_token = request.data.get('captcha_token')
    if not validate_recaptcha_v3(captcha_token, 'register'):
        return Response({'error': 'Invalid captcha'}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    captcha_token = request.data.get('captcha_token')
    if not validate_recaptcha_v3(captcha_token, 'login'):
        return Response({'error': 'Invalid captcha'}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except:
        pass
    return Response({'message': 'Successfully logged out'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def profile_view(request):
    return Response(UserSerializer(request.user).data)


class UserChannelListCreateView(generics.ListCreateAPIView):
    serializer_class = UserChannelSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserChannel.objects.filter(user=self.request.user).order_by('channel__title')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserChannelDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserChannelSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserChannel.objects.filter(user=self.request.user)


class UserVideoListCreateView(generics.ListCreateAPIView):
    serializer_class = UserVideoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserVideo.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserVideoDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserVideoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserVideo.objects.filter(user=self.request.user)
    
    def perform_update(self, serializer):
        if serializer.validated_data.get('is_watched') and not serializer.instance.watched_at:
            serializer.save(watched_at=timezone.now())
        else:
            serializer.save()
