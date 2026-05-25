# AWS Strategy: Mock Locally, Migrate Later

**TL;DR:** Use local mocks (file storage, in-memory auth) during Sprint 1. Migrate to AWS (S3, RDS, Cognito) in Sprint 2 after core features work.

---

## Why Mock Locally First?

### Speed
- No AWS account setup, IAM roles, credentials
- No deployment delays (5 min local vs 20 min AWS)
- Faster iteration = features done sooner

### Cost
- $0 during development (Docker is free)
- AWS only costs $$ once you have users
- No surprise bills from accidental resources

### Reliability
- Your laptop is the source of truth
- No network latency, no AWS API timeouts
- Easy to debug (local = full control)

### Risk
- No production data exposed during development
- Easy to reset: `docker-compose down -v`
- Safe to experiment

---

## Sprint 1 Architecture: Local Development

```
Frontend (React)         Backend (FastAPI)         Database
├─ Vite dev server    ├─ Uvicorn (hot reload)  ├─ PostgreSQL 15
├─ Port: 3000         ├─ Port: 8000            ├─ Docker volume
└─ Node modules       ├─ Code reload on save   └─ Persists data

Storage (Local)         Auth (JWT)              Cache (Redis)
├─ /app/uploads/      ├─ JWT tokens (local)   ├─ Sessions
├─ Documents stored   ├─ No Cognito yet       ├─ Rate limiting
└─ File system        └─ Secrets in .env      └─ Redis 7

CI/CD: GitHub Actions
├─ Test on push
├─ Lint on push
├─ Docker build on tag
└─ No AWS deployment yet
```

**All in Docker. Zero AWS services.**

---

## Local Mock Implementations

### 1. Document Storage: Local File System

**Sprint 1 (Local)**

```python
# backend/app/services/storage_service.py

class LocalStorageService:
    def __init__(self):
        self.upload_dir = Path("/app/uploads/documents")
        self.upload_dir.mkdir(exist_ok=True)

    async def upload(self, user_id: str, file: UploadFile) -> str:
        # Save to /app/uploads/documents/{user_id}/{filename}
        filename = f"{user_id}/{file.filename}"
        filepath = self.upload_dir / filename
        
        with open(filepath, "wb") as f:
            f.write(await file.read())
        
        return f"file://{filepath}"

    async def download(self, file_path: str) -> bytes:
        with open(file_path, "rb") as f:
            return f.read()

    async def delete(self, file_path: str):
        Path(file_path).unlink()
```

**Sprint 2 (AWS)**

```python
# Same interface, swap to S3
class S3StorageService:
    def __init__(self):
        self.s3 = boto3.client("s3")
        self.bucket = "careercompass-prod"

    async def upload(self, user_id: str, file: UploadFile) -> str:
        key = f"documents/{user_id}/{file.filename}"
        self.s3.upload_fileobj(
            Fileobj=await file.read(),
            Bucket=self.bucket,
            Key=key
        )
        return f"s3://{self.bucket}/{key}"
```

**Benefits:** Same interface. Swap implementations at config time.

### 2. Authentication: JWT (Local)

**Sprint 1 (Local)**

```python
# backend/app/core/security.py

class LocalAuthService:
    def create_token(self, user_id: str) -> str:
        # Simple JWT, local secret key
        payload = {
            "sub": user_id,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

    def verify_token(self, token: str) -> str:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["sub"]
```

**Sprint 2 (AWS)**

```python
# Same interface, use Cognito
class CognitoAuthService:
    def __init__(self):
        self.cognito = boto3.client("cognito-idp")
        self.user_pool_id = AWS_COGNITO_USER_POOL_ID

    def create_token(self, username: str, password: str) -> str:
        response = self.cognito.admin_initiate_auth(
            UserPoolId=self.user_pool_id,
            ClientId=self.client_id,
            AuthFlow="ADMIN_NO_SRP_AUTH",
            AuthParameters={
                "USERNAME": username,
                "PASSWORD": password
            }
        )
        return response["AuthenticationResult"]["IdToken"]
```

**Benefits:** Swap auth provider without touching route handlers.

### 3. Database: PostgreSQL (Same in Both)

**Sprint 1 & 2**

```python
# Database stays the same
DATABASE_URL = "postgresql://compass:compass_dev@postgres:5432/compass_dev"  # Local dev
DATABASE_URL = "postgresql://compass:SECURE_PASSWORD@rds-endpoint.aws.amazon.com:5432/compass_prod"  # AWS
```

**Why:** PostgreSQL is managed. Use local Docker in dev, RDS in production. No code changes.

---

## Configuration Strategy: Environment Swapping

**Key insight:** Use environment variables to swap implementations.

```python
# backend/app/core/config.py

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"  # development, production
    USE_AWS: bool = False
    
    AWS_REGION: str = "eu-central-1"
    AWS_S3_BUCKET: str = "careercompass-dev"
    AWS_COGNITO_USER_POOL_ID: str = ""
    
    @property
    def storage_service(self):
        if self.USE_AWS:
            from app.services.aws_storage import S3StorageService
            return S3StorageService()
        else:
            from app.services.local_storage import LocalStorageService
            return LocalStorageService()
    
    @property
    def auth_service(self):
        if self.USE_AWS:
            from app.services.aws_auth import CognitoAuthService
            return CognitoAuthService()
        else:
            from app.services.local_auth import LocalAuthService
            return LocalAuthService()

settings = Settings()
```

**Routes don't care:**

```python
@router.post("/documents")
async def upload_document(
    file: UploadFile,
    storage: StorageService = Depends(lambda: settings.storage_service)
):
    file_path = await storage.upload(user_id, file)
    return {"file_path": file_path}
```

Same code, different backends.

---

## Sprint 1 .env Configuration

```env
# backend/.env.dev (local development)

ENVIRONMENT=development
USE_AWS=False
DEBUG=True
SECRET_KEY=dev-secret-key

DATABASE_URL=postgresql://compass:compass_dev@postgres:5432/compass_dev
REDIS_URL=redis://redis:6379/0

JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# AWS (not used, but defined for future)
AWS_REGION=eu-central-1
AWS_S3_BUCKET=careercompass-dev-bucket
AWS_COGNITO_USER_POOL_ID=
AWS_COGNITO_CLIENT_ID=
```

---

## Migration Path: Sprint 1 → Sprint 2

**After Sprint 1 is complete (32 issues done, all features working locally):**

### Week 1: AWS Setup (Sprint 2.1)

```
1. Create AWS account (if not done)
2. Set up services:
   ├─ RDS (PostgreSQL managed)
   ├─ S3 (document storage)
   ├─ Cognito (user authentication)
   ├─ ECR (container registry)
   ├─ ECS (container orchestration)
   ├─ ALB (load balancer)
   ├─ CloudFront (CDN for frontend)
   └─ Secrets Manager (secure credentials)

3. Create credentials
   ├─ IAM user for deployment
   ├─ AWS_ACCESS_KEY_ID
   ├─ AWS_SECRET_ACCESS_KEY
   └─ Store in GitHub Secrets

4. Create Cognito User Pool
   ├─ Configure password policy
   ├─ Enable MFA (optional)
   ├─ Create app client
   ├─ Save pool ID & client ID
   └─ Store in .env.prod
```

### Week 2: Code Migration (Sprint 2.2)

```
1. Create production implementations
   ├─ S3StorageService (copy template below)
   ├─ CognitoAuthService (copy template below)
   └─ Keep LocalStorageService (for dev/test)

2. Update configuration
   ├─ Add AWS_ACCESS_KEY_ID to .env.prod
   ├─ Add AWS_COGNITO_* to .env.prod
   ├─ Ensure USE_AWS=True in production
   └─ Ensure USE_AWS=False in .env.dev

3. Test locally with AWS flag
   ├─ Create test credentials
   ├─ Set USE_AWS=True in .env
   ├─ Run integration tests against AWS
   └─ Verify file uploads go to S3, auth uses Cognito

4. Deploy to ECS
   ├─ Build Docker images
   ├─ Push to ECR
   ├─ Deploy via ECS console or Terraform
   ├─ Test in staging environment
   └─ Promote to production
```

### Week 3: Data Migration (Sprint 2.3)

```
1. Migrate PostgreSQL data
   ├─ Dump local database
   ├─ Restore to RDS
   ├─ Verify data integrity

2. Migrate documents
   ├─ Copy /uploads/documents → S3
   ├─ Update file_path in database
   ├─ Verify all documents accessible

3. Cutover
   ├─ Set USE_AWS=True in production
   ├─ Monitor logs for errors
   ├─ Roll back plan ready
```

---

## Code Templates for AWS Implementations

### S3 Storage Service Template

```python
# backend/app/services/aws_storage.py

import boto3
from typing import BinaryIO
from app.core.config import settings

class S3StorageService:
    def __init__(self):
        self.s3 = boto3.client(
            "s3",
            region_name=settings.AWS_REGION
        )
        self.bucket = settings.AWS_S3_BUCKET
    
    async def upload(self, user_id: str, file_obj: BinaryIO, filename: str) -> str:
        """Upload file to S3, return S3 key"""
        key = f"documents/{user_id}/{uuid4()}-{filename}"
        
        self.s3.upload_fileobj(
            Fileobj=file_obj,
            Bucket=self.bucket,
            Key=key,
            ExtraArgs={"ServerSideEncryption": "AES256"}
        )
        
        # Return signed URL (valid for 24 hours)
        url = self.s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=86400
        )
        return url
    
    async def download(self, file_path: str) -> bytes:
        """Download file from S3"""
        response = self.s3.get_object(Bucket=self.bucket, Key=file_path)
        return response["Body"].read()
    
    async def delete(self, file_path: str):
        """Delete file from S3"""
        self.s3.delete_object(Bucket=self.bucket, Key=file_path)
```

### Cognito Auth Service Template

```python
# backend/app/services/aws_auth.py

import boto3
from app.core.config import settings
import json

class CognitoAuthService:
    def __init__(self):
        self.cognito = boto3.client(
            "cognito-idp",
            region_name=settings.AWS_REGION
        )
        self.user_pool_id = settings.AWS_COGNITO_USER_POOL_ID
        self.client_id = settings.AWS_COGNITO_CLIENT_ID
    
    async def register(self, email: str, password: str, name: str) -> str:
        """Create user in Cognito"""
        try:
            self.cognito.admin_create_user(
                UserPoolId=self.user_pool_id,
                Username=email,
                TemporaryPassword=password,
                MessageAction="SUPPRESS"
            )
            
            # Set permanent password
            self.cognito.admin_set_user_password(
                UserPoolId=self.user_pool_id,
                Username=email,
                Password=password,
                Permanent=True
            )
            return email
        except self.cognito.exceptions.UsernameExistsException:
            raise ValueError("User already exists")
    
    async def login(self, email: str, password: str) -> dict:
        """Authenticate user, return tokens"""
        response = self.cognito.admin_initiate_auth(
            UserPoolId=self.user_pool_id,
            ClientId=self.client_id,
            AuthFlow="ADMIN_NO_SRP_AUTH",
            AuthParameters={
                "USERNAME": email,
                "PASSWORD": password
            }
        )
        
        tokens = response["AuthenticationResult"]
        return {
            "access_token": tokens["AccessToken"],
            "id_token": tokens["IdToken"],
            "refresh_token": tokens["RefreshToken"]
        }
    
    async def verify_token(self, token: str) -> dict:
        """Verify JWT token, return user info"""
        # Cognito tokens are JWTs, verify offline
        import jwt
        from jwt import PyJWTError
        
        try:
            # Decode token (public key verification)
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload
        except PyJWTError:
            raise ValueError("Invalid token")
```

---

## Testing Strategy: Works Locally, Works in AWS

**Key principle:** Tests should pass locally and in AWS without code changes.

```python
# backend/tests/test_storage.py

@pytest.fixture
def storage_service():
    """Parametrized test runs against local AND AWS"""
    if os.getenv("TEST_AWS"):
        from app.services.aws_storage import S3StorageService
        return S3StorageService()
    else:
        from app.services.local_storage import LocalStorageService
        return LocalStorageService()

def test_upload_and_download(storage_service):
    """Same test, works for both implementations"""
    # Upload
    file_content = b"test content"
    file_path = storage_service.upload("user123", file_content, "test.txt")
    
    # Download
    retrieved = storage_service.download(file_path)
    assert retrieved == file_content
    
    # Cleanup
    storage_service.delete(file_path)
```

**Run locally:**
```bash
pytest  # Uses LocalStorageService
```

**Run against AWS:**
```bash
TEST_AWS=true pytest  # Uses S3StorageService
```

---

## Rollback Plan (If AWS Migration Breaks)

**If production is down:**

```
1. Immediate: Revert to local/previous version
   ├─ git revert <commit-hash>
   ├─ docker build . && docker push
   └─ Re-deploy to ECS

2. Investigate: What broke?
   ├─ Check CloudWatch logs (Lambda, ECS)
   ├─ Check RDS database connection
   ├─ Check S3 permissions

3. Fix: (Do NOT push broken code)
   ├─ Reproduce locally with AWS flag
   ├─ Fix in development
   ├─ Test locally + against staging AWS
   ├─ Then deploy to production

4. Prevention: Add to CI
   ├─ Integration tests against real AWS services (staging)
   ├─ Smoke tests after deployment
   └─ Automated rollback if health check fails
```

---

## Cost Estimate: AWS Production

**Monthly costs (rough):**

```
RDS (PostgreSQL):           $30-50  (db.t3.micro free tier eligible)
S3 (document storage):      $5-10   (low usage)
Cognito:                    $0      (free up to 50k users)
ECS (2 tasks):              $20-40  (if not using free tier)
ALB:                        $15     (load balancer)
CloudFront (CDN):           $5      (low usage)
───────────────────────────────────
TOTAL:                      $75-155/month

With free tier eligible: $0-20/month for first year
```

**Make it cheaper:** Use AWS free tier for databases & services first 12 months.

---

## Summary: Local First, AWS Later

| Aspect | Sprint 1 (Local) | Sprint 2 (AWS) |
|--------|-----------------|----------------|
| **Storage** | File system (`/uploads/`) | S3 |
| **Auth** | JWT + database | Cognito |
| **Database** | PostgreSQL (Docker) | RDS (managed) |
| **API** | Local Docker | ECS + ALB |
| **Frontend** | Vite dev server | Cloudfront + S3 |
| **Cost** | $0 | $75-155/month |
| **Setup time** | 10 min (Docker) | 1 week (full AWS) |
| **Iteration speed** | Fast (no deploy) | Slower (deploy needed) |

**Decision:** Stay local in Sprint 1. Migrate when features are stable (Sprint 2+).

---

**Next: Start KAN-1 (Docker setup). AWS is for later.**
