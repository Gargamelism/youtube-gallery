import os
import sys
import django
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

def setup_django():
    """Configure Django environment"""
    sys.path.insert(0, '/app')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'youtube_gallery.settings')
    django.setup()

def check_credentials_file():
    """Check if client_secret.json exists"""
    credentials_dir = Path('/app/config/credentials')
    client_secret_path = credentials_dir / 'client_secret.json'
    
    if not client_secret_path.exists():
        print(f"Error: client_secret.json not found at {client_secret_path}")
        print("Please download client_secret.json from Google Cloud Console")
        print("and place it in the config/credentials/ directory")
        return False
    
    print(f"Found client_secret.json at {client_secret_path}")
    return True

def authenticate_with_manual_flow():
    """Authenticate using manual OAuth flow for headless environments"""
    
    SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']
    credentials_dir = Path('/app/config/credentials')
    client_secret_path = credentials_dir / 'client_secret.json'
    token_path = credentials_dir / 'token.json'
    
    credentials = None
    
    # Load existing token if available
    if token_path.exists():
        credentials = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    
    # Refresh or create new credentials
    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            print("Refreshing existing credentials...")
            credentials.refresh(Request())
        else:
            print("Starting manual OAuth flow...")
            flow = InstalledAppFlow.from_client_secrets_file(str(client_secret_path), SCOPES)
            
            # Set redirect URI for manual flow
            flow.redirect_uri = 'urn:ietf:wg:oauth:2.0:oob'
            
            # Generate authorization URL
            auth_url, _ = flow.authorization_url(
                prompt='consent',
                access_type='offline'
            )
            
            print("\nManual authentication required:")
            print("1. Copy this URL and open it in your browser:")
            print(f"\n{auth_url}\n")
            print("2. Complete the authorization in your browser")
            print("3. Google will show you an authorization code")
            print("4. Copy that authorization code and paste it below")
            
            # Get authorization code from user
            auth_code = input("Enter the authorization code: ").strip()
            
            try:
                # Exchange code for credentials
                flow.fetch_token(code=auth_code)
                credentials = flow.credentials
            except Exception as e:
                print(f"Failed to exchange authorization code: {e}")
                return None
        
        # Save credentials
        with open(token_path, 'w') as token_file:
            token_file.write(credentials.to_json())
        print(f"Credentials saved to {token_path}")
    
    return credentials

def test_youtube_api(credentials):
    """Test the YouTube API with the credentials"""
    try:
        youtube = build('youtube', 'v3', credentials=credentials)
        
        # Test with a simple API call
        request = youtube.channels().list(part="snippet", mine=True)
        response = request.execute()
        
        print("YouTube API test successful!")
        if response.get('items'):
            channel = response['items'][0]
            print(f"Authenticated as: {channel['snippet']['title']}")
        
        return True
    except Exception as e:
        print(f"YouTube API test failed: {e}")
        return False

def main():
    """Main authentication workflow"""
    print("Starting YouTube API authentication...")
    
    try:
        setup_django()
        
        if not check_credentials_file():
            sys.exit(1)
        
        credentials = authenticate_with_manual_flow()
        if not credentials:
            print("Authentication failed")
            sys.exit(1)
        
        if test_youtube_api(credentials):
            print("Authentication complete! Token saved for future use.")
        else:
            print("Authentication succeeded but API test failed")
            sys.exit(1)
            
    except Exception as e:
        print(f'Authentication failed: {e}')
        sys.exit(1)

if __name__ == "__main__":
    main()
