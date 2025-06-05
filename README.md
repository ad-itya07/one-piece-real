# Chapter Performance Dashboard API

A comprehensive RESTful API backend for managing chapter performance data with advanced features like caching, rate limiting, and robust data validation.

## 🚀 Features

- **RESTful API Design** - Clean, intuitive endpoints following REST principles
- **MongoDB Integration** - Robust data persistence with Mongoose ODM
- **Redis Caching** - High-performance caching with automatic invalidation
- **Rate Limiting** - IP-based rate limiting using Redis
- **Data Validation** - Comprehensive input validation with Joi
- **File Upload Support** - JSON file upload for bulk chapter creation
- **Advanced Filtering** - Multiple filter options with pagination
- **Admin Authentication** - Secure admin-only operations
- **Error Handling** - Comprehensive error handling and logging
- **Docker Support** - Easy deployment with Docker Compose

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (v5.0 or higher)
- Redis (v6.0 or higher)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd chapter-performance-dashboard-api
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/chapter-dashboard
REDIS_URL=redis://localhost:6379
ADMIN_SECRET_KEY=your_secure_admin_key
CACHE_TTL=3600
```

4. **Start MongoDB and Redis**
```bash
# MongoDB (if not using Docker)
mongod

# Redis (if not using Docker)
redis-server
```

5. **Start the application**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Docker Deployment

1. **Using Docker Compose (Recommended)**
```bash
docker-compose up -d
```

This will start:
- API server on port 3000
- MongoDB on port 27017
- Redis on port 6379
- Mongo Express (DB admin) on port 8081
- Redis Commander (Redis admin) on port 8082

2. **Building custom image**
```bash
docker build -t chapter-api .
docker run -p 3000:3000 chapter-api
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
Admin operations require authentication via:
- Header: `x-admin-key: your_admin_secret_key`
- Or: `Authorization: Bearer your_admin_secret_key`

### Endpoints

#### 📖 Public Endpoints

**GET /api/v1/chapters**
- Get all chapters with filtering and pagination
- Query Parameters:
  - `class` - Filter by class name
  - `unit` - Filter by unit name
  - `status` - Filter by status (Not Started, In Progress, Completed, Revision)
  - `weakChapters` - Filter weak chapters (true/false)
  - `subject` - Filter by subject
  - `page` - Page number (default: 1)
  - `limit` - Items per page (default: 10, max: 100)
  - `sortBy` - Sort field (default: createdAt)
  - `sortOrder` - Sort order (asc/desc, default: desc)

**GET /api/v1/chapters/:id**
- Get specific chapter by ID

**GET /api/v1/chapters/stats**
- Get comprehensive statistics

#### 🔒 Admin Endpoints

**POST /api/v1/chapters**
- Create chapters (bulk upload supported)
- Content-Type: `application/json` or `multipart/form-data`
- Body: Array of chapter objects or JSON file

**PUT /api/v1/chapters/:id**
- Update entire chapter

**PATCH /api/v1/chapters/:id**
- Partial chapter update

**DELETE /api/v1/chapters/:id**
- Delete chapter

### 📝 Data Schema

```json
{
  "subject": "Physics",
  "chapter": "Mathematics in Physics",
  "class": "Class 11",
  "unit": "Mechanics 1",
  "yearWiseQuestionCount": {
    "2019": 0,
    "2020": 2,
    "2021": 5,
    "2022": 5,
    "2023": 3,
    "2024": 7,
    "2025": 6
  },
  "questionSolved": 0,
  "status": "Not Started",
  "isWeakChapter": false
}
```

### 📊 Example Requests

#### Get Filtered Chapters
```bash
curl "http://localhost:3000/api/v1/chapters?class=Class%2011&status=Not%20Started&page=1&limit=5"
```

#### Upload Chapters (JSON)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your_admin_secret_key" \
  -d '[{"subject":"Math","chapter":"Algebra","class":"Class 10","unit":"Unit 1","yearWiseQuestionCount":{"2024":5},"questionSolved":0,"status":"Not Started","isWeakChapter":false}]' \
  http://localhost:3000/api/v1/chapters
```

#### Upload Chapters (File)
```bash
curl -X POST \
  -H "x-admin-key: your_admin_secret_key" \
  -F "chapters=@chapters.json" \
  http://localhost:3000/api/v1/chapters
```

### 📈 Response Format

#### Success Response
```json
{
  "status": "success",
  "data": {
    "chapters": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 50,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### Error Response
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "subject",
      "message": "Subject is required"
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🚦 Rate Limiting

- **General API**: 30 requests per minute per IP
- **Admin API**: 100 requests per minute per IP
- Rate limit info in response headers

## 💾 Caching

- **GET /api/v1/chapters**: Cached for 1 hour
- **GET /api/v1/chapters/stats**: Cached for 30 minutes
- **GET /api/v1/chapters/:id**: Cached for 1 hour
- Cache automatically invalidated on data changes

## 🔧 Performance Optimizations

- Database indexing on frequently queried fields
- Lean queries for better performance
- Compression middleware
- Connection pooling
- Aggregation pipelines for complex queries

## 🛡️ Security Features

- Helmet.js for security headers
- Input validation and sanitization
- Rate limiting to prevent abuse
- Admin authentication for sensitive operations
- CORS configuration

## 🐛 Error Handling

Comprehensive error handling for:
- Validation errors
- Database errors
- Authentication errors
- Rate limit errors
- File upload errors
- Cache errors

## 📊 Monitoring

- Health check endpoint: `GET /health`
- Comprehensive logging
- Error tracking
- Performance metrics

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Health check
curl http://localhost:3000/health
```

## 🚀 Deployment

### Production Checklist

1. Set strong `ADMIN_SECRET_KEY`
2. Configure production MongoDB URI
3. Set up Redis persistence
4. Configure reverse proxy (Nginx)
5. Set up SSL/TLS
6. Configure monitoring and logging
7. Set up automated backups

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/chapter-dashboard |
| `REDIS_URL` | Redis connection string | redis://localhost:6379 |
| `ADMIN_SECRET_KEY` | Admin authentication key | - |
| `CACHE_TTL` | Cache TTL in seconds | 3600 |




