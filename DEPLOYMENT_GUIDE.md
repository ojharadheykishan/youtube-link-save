# 🚀 Website Deployment Guide - VideoHub

## Quick Start: Deployment Steps

---

## **Phase 1: Initial Setup (Local Machine)**

### Step 1: Install Required Dependencies
```bash
# Update pip
python -m pip install --upgrade pip

# Install all requirements
pip install -r requirements.txt
```

### Step 2: Configure Environment
```bash
# Create .env file (if needed)
touch .env

# Add configuration (optional)
echo "DEBUG=False" >> .env
echo "SECRET_KEY=your-secret-key-here" >> .env
```

### Step 3: Test Locally
```bash
# Run the application
python app.py

# Visit in browser
# http://localhost:8000
```

---

## **Phase 2: Production Deployment**

### Option A: Deploy on **Render** (Recommended - Easiest)

#### Step 1: Prepare Repository
```bash
# Push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### Step 2: Create on Render.com
1. Go to [render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `videohub` (or your choice)
   - **Environment**: `Python 3`
   - **Build Command**: 
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**: 
     ```bash
     uvicorn app:app --host 0.0.0.0 --port 8000
     ```
   - **Environment Variables**: Add if needed
5. Click **"Create Web Service"**
6. Done! Your site will be live at `https://videohub.onrender.com`

---

### Option B: Deploy on **Heroku**

#### Step 1: Install Heroku CLI
```bash
# On Mac
brew tap heroku/brew && brew install heroku

# On Linux
curl https://cli-assets.heroku.com/install.sh | sh

# On Windows
Download from: https://devcenter.heroku.com/articles/heroku-cli
```

#### Step 2: Create Procfile
```bash
# Create Procfile in root directory
echo "web: uvicorn app:app --host 0.0.0.0 --port \$PORT" > Procfile
```

#### Step 3: Create runtime.txt (optional)
```bash
echo "python-3.11.0" > runtime.txt
```

#### Step 4: Deploy
```bash
# Login to Heroku
heroku login

# Create app
heroku create videohub

# Push to Heroku
git push heroku main

# View logs
heroku logs --tail
```

**Your site**: `https://videohub.herokuapp.com`

---

### Option C: Deploy on **Railway.app** (Fast & Easy)

#### Step 1: Connect GitHub
1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub Repo"**
4. Choose your repository

#### Step 2: Configure
Railway auto-detects Python and installs dependencies

#### Step 3: Add Environment Variables
- Click **"Variables"** tab
- Add any needed environment variables

#### Step 4: Deploy
Click **"Deploy"** - Done!

---

### Option D: Deploy on **Vercel** (Modern Choice)

#### Step 1: Create vercel.json
```json
{
  "builds": [
    {
      "src": "app.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.py"
    }
  ]
}
```

#### Step 2: Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts
```

---

### Option E: Deploy on **AWS EC2** (For Production)

#### Step 1: Launch EC2 Instance
```bash
# Select Ubuntu 22.04 LTS AMI
# Instance type: t3.micro (free tier eligible)
# Configure security group:
#   - Port 80 (HTTP)
#   - Port 443 (HTTPS)
#   - Port 22 (SSH)
```

#### Step 2: SSH Into Instance
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-instance-ip
```

#### Step 3: Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python
sudo apt install python3-pip python3-venv -y

# Clone repository
git clone https://github.com/yourusername/youtube-link-save.git
cd youtube-link-save

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

#### Step 4: Install & Configure Nginx
```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/videohub
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/videohub /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

#### Step 5: Install SSL (HTTPS)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

#### Step 6: Run App with PM2 (Process Manager)
```bash
# Install PM2
sudo npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'videohub',
    script: 'uvicorn app:app --host 0.0.0.0 --port 8000',
    env: {
      NODE_ENV: "production"
    }
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

---

### Option F: Deploy on **DigitalOcean App Platform**

#### Step 1: Connect GitHub
1. Go to [DigitalOcean](https://digitalocean.com)
2. Create account and link GitHub

#### Step 2: Create App
1. Click **"Create"** → **"Apps"**
2. Select your repository
3. DigitalOcean auto-configures Python apps

#### Step 3: Deploy
Click **"Deploy"** button

---

## **Phase 3: Post-Deployment Setup**

### Update Database Location
```bash
# Ensure all JSON databases are accessible
# Make sure data directories have proper permissions
chmod -R 755 data/
chmod -R 755 videos/
```

### Configure Environment Variables
```bash
# Add these if needed:
DEBUG=False
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
SECRET_KEY=generate-a-secure-key
```

### Backup Strategy
```bash
# Regularly backup database files
cp video_db.json video_db.json.backup
cp users_db.json users_db.json.backup
cp folder_db.json folder_db.json.backup
```

---

## **Phase 4: Testing Deployment**

### Verify All Features
```bash
✅ Login/Register working
✅ Video upload/download working
✅ Search functionality working
✅ Folder management working
✅ Video player loading
✅ Responsive design working
✅ Mobile view working
```

### Monitor Performance
```bash
# Check server logs
tail -f logs/app.log

# Monitor CPU/Memory
top
htop
```

---

## **Phase 5: Domain Setup (Optional)**

### Step 1: Buy Domain
- Namecheap, GoDaddy, or any registrar

### Step 2: Configure DNS
Point DNS to your deployment platform:

**For Render:**
```
CNAME: videohub.onrender.com
```

**For Heroku:**
```
CNAME: videohub.herokuapp.com
```

**For AWS/DigitalOcean:**
```
A Record: your-elastic-ip-or-server-ip
```

### Step 3: Enable SSL
Most platforms auto-enable HTTPS

---

## **Recommended Deployment Path** 🎯

### For Beginners:
1. **Render.com** (✅ Easiest, Free tier available)
   - 1-click deployment
   - Auto HTTPS
   - Free tier: 0.5GB RAM

### For Small Projects:
2. **Railway.app** (✅ Simple, Fast)
   - GitHub integration
   - Auto-scaling
   - $5/month minimum

### For Full Control:
3. **AWS EC2** (✅ Powerful, Scalable)
   - Free tier eligible
   - Full customization
   - Pay-as-you-go

---

## **Quick Deployment Checklist** ✅

- [ ] All code committed and pushed to GitHub
- [ ] requirements.txt is up to date
- [ ] Environment variables configured
- [ ] Database files included (or created on first run)
- [ ] Static files properly configured
- [ ] CORS settings correct
- [ ] API endpoints tested
- [ ] UI improvements visible
- [ ] Video player working
- [ ] Error handling working
- [ ] Performance optimized
- [ ] Monitoring setup done

---

## **Troubleshooting**

### Issue: Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### Issue: Database Not Found
```bash
# Ensure data directory exists
mkdir -p data/
mkdir -p videos/
```

### Issue: Static Files Not Loading
```bash
# Check static mount in app.py
app.mount("/static", StaticFiles(directory="static"), name="static")
```

### Issue: CORS Errors
```bash
# Add CORS middleware in app.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## **Support URLs**

- 📖 Render Docs: https://render.com/docs
- 📖 Heroku Docs: https://devcenter.heroku.com
- 📖 FastAPI Docs: https://fastapi.tiangolo.com/deployment
- 📖 Railway Docs: https://docs.railway.app
- 📖 AWS EC2 Guide: https://docs.aws.amazon.com/ec2

---

**Status**: ✅ Ready to Deploy!

Choose your preferred platform above and follow the steps. Most deployments take **5-15 minutes**! 🚀
