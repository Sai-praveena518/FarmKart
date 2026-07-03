# FarmKart Deployment

## Local Run

1. Create a MySQL database:

```sql
CREATE DATABASE farmers_market;
```

2. Copy backend environment values:

```bash
cp backend/.env.example backend/.env
```

3. Set real backend values in `backend/.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=farmers_market
JWT_SECRET_KEY=use-a-long-random-secret
WEATHER_API_KEY=your-openweather-key
SUPERADMIN_PASSWORD=use-a-strong-password
CORS_ORIGINS=http://localhost:5173
```

4. Install and run the backend:

```bash
cd backend
pip install -r requirements.txt
python backend/app.py
```

5. Copy frontend environment values:

```bash
cp frontend/.env.example frontend/.env
```

6. Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Frontend Build

```bash
cd frontend
npm run build
```

The production files are generated in `frontend/dist`.

## Frontend Hosting

### Vercel

- Import the Git repository.
- Set the root directory to `frontend`.
- Build command: `npm run build`.
- Output directory: `dist`.
- Add environment variable `VITE_API_URL=https://your-backend-domain`.

### Netlify

- Import the Git repository.
- Base directory: `frontend`.
- Build command: `npm run build`.
- Publish directory: `frontend/dist`.
- Add environment variable `VITE_API_URL=https://your-backend-domain`.

## Backend Hosting

### Render

- Create a new Web Service.
- Root directory: `backend`.
- Build command: `pip install -r requirements.txt`.
- Start command: `python backend/app.py`.
- Add the backend environment variables from `backend/.env.example`.
- Set `CORS_ORIGINS` to the production frontend URL.

### Railway

- Create a new service from the repository.
- Set the service root to `backend`.
- Install command: `pip install -r requirements.txt`.
- Start command: `python backend/app.py`.
- Add MySQL and backend environment variables.
- Set `CORS_ORIGINS` to the production frontend URL.

## MySQL Setup

Use a managed MySQL service or your server MySQL instance.

```sql
CREATE DATABASE farmers_market;
CREATE USER 'farmkart_user'@'%' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON farmers_market.* TO 'farmkart_user'@'%';
FLUSH PRIVILEGES;
```

Set:

```env
DB_HOST=your-mysql-host
DB_USER=farmkart_user
DB_PASSWORD=strong-password
DB_NAME=farmers_market
```

The Flask app creates and migrates the required tables on startup through `init_database()`.

## Connect a .in Domain

1. Deploy frontend and backend first.
2. In Vercel or Netlify, add the `.in` domain to the frontend project.
3. At the domain registrar, create the DNS records shown by the hosting provider.
4. For backend custom domains, add an API subdomain such as `api.yourdomain.in` in Render or Railway.
5. Point DNS for the API subdomain to the backend host.
6. Update frontend `VITE_API_URL=https://api.yourdomain.in`.
7. Update backend `CORS_ORIGINS=https://yourdomain.in,https://www.yourdomain.in`.
8. Redeploy both services.

## Required Environment Variables

Backend:

```env
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET_KEY=
SECRET_KEY=
WEATHER_API_KEY=
SUPERADMIN_PASSWORD=
CORS_ORIGINS=
```

Frontend:

```env
VITE_API_URL=
```

## Security Notes

- Do not commit real API keys, passwords, or JWT secrets.
- Keep `WEATHER_API_KEY` only in the backend environment.
- The frontend must call backend weather APIs, not OpenWeather directly.
- Restrict `CORS_ORIGINS` to the production frontend domains before launch.
