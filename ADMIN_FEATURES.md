M # Admin Panel - Complete Features Guide

## Overview
The admin panel is now fully equipped with comprehensive system management features including an **Admin Control Toggle** to enable/disable all administrative functions.

---

## 🎛️ Admin Control Toggle

**Location:** System Settings Section
- **Master Switch:** "Enable Admin Mode" checkbox
- When **disabled**: All admin functions are locked and inaccessible
- When **enabled**: Full access to all administrative features
- This setting is persistent and stored in `admin_settings.json`

---

## 📊 Dashboard

View real-time system statistics:
- **Total Users** - Complete user count
- **Active Users** - Currently active accounts
- **Total Videos** - All videos in system
- **Total Views** - Aggregate view counts
- **Storage Used** - Total storage in MB
- **Total Folders** - All folders/playlists
- **Recent Activity Feed** - System event log

---

## 👥 User Management

### Features:
- **User List Table** with columns:
  - Username
  - Email
  - Role (Admin/User badge)
  - Status (Active/Inactive)
  - Created Date
  - Last Login
  - Login Count
  - Actions

### Actions per User:
- **Ban/Activate** - Toggle user account status
- **Delete** - Permanently remove user and all their data
- **Search** - Real-time search across all user fields

### Protected:
- Admin user cannot be banned or deleted

---

## 🎥 Video Management

### Features:
- **Video List Table** with columns:
  - Title
  - User (uploader)
  - URL
  - View Count
  - Added Date
  - Actions

### Actions:
- **Delete** - Remove video from system
- **Search** - Search by title, URL, or username

### Automatic:
- Thumbnail cleanup on deletion
- Database synchronization

---

## ⚙️ System Settings

### Admin Control:
```
[☑] Enable Admin Mode
    └─ Master switch for all admin features
```

### Configuration Options:

#### Upload Settings:
- **Max Upload Size (MB)** - Limit per-video size
- **Max Videos per User** - Quota per user account

#### Feature Toggles:
- **Enable Video Moderation** - Content review system
- **Enable User Notifications** - Alert system

### Database Management:

#### Backup Database
- Creates `.zip` file with all databases
- Includes: Videos, Folders, Playlists, Users, Settings
- Timestamped filename: `backup_YYYYMMDD_HHMMSS.zip`
- Auto-downloads to local machine

#### Clear Cache
- Clears `video_cache.json`
- Removes Python `__pycache__`
- Improves performance

#### Reset Database ⚠️
- **DESTRUCTIVE OPERATION**
- Clears all data except admin user
- Keeps admin account with default credentials
- Double confirmation required
- Cannot be undone

---

## 📋 Content Moderation

Placeholder for future content moderation features:
- Video flagging system
- Content review workflow
- Automated filters

---

## 📜 Activity Logs

Placeholder for comprehensive logging:
- User actions
- Video operations
- System events
- Admin actions
- Access logs

---

## 🔐 Security Features

### Authentication:
- All admin endpoints require valid auth token
- Admin role verification on every request
- Session-based access control

### Protected Actions:
- Admin user cannot be deleted
- Admin user cannot be banned
- Database operations require admin role

---

## 📁 Database Files

Admin settings are stored in: **`admin_settings.json`**

```json
{
  "admin_enabled": true,
  "max_upload_size": 100,
  "max_videos_per_user": 1000,
  "enable_moderation": false,
  "enable_notifications": true
}
```

---

## API Endpoints

All endpoints require admin authentication via `auth_token` cookie.

### Statistics & Data:
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - All users list
- `GET /api/admin/videos` - All videos list
- `GET /api/admin/settings` - Current settings

### User Management:
- `POST /api/admin/users/{username}/toggle` - Ban/Activate user
- `DELETE /api/admin/users/{username}/delete` - Delete user

### Video Management:
- `DELETE /api/admin/videos/{video_id}/delete` - Delete video

### Settings:
- `POST /api/admin/settings/update` - Update configuration

### Database Operations:
- `POST /api/admin/backup` - Create database backup
- `POST /api/admin/clear-cache` - Clear system cache
- `POST /api/admin/reset-database` - Reset all data

---

## 🚀 Usage Instructions

### Accessing Admin Panel:
1. Login as admin user
2. Navigate to `/admin` endpoint
3. Admin Mode should be enabled by default

### Disabling Admin Features:
1. Go to System Settings tab
2. Uncheck "Enable Admin Mode"
3. All admin features become inaccessible
4. Re-enable by checking the box again

### Backing Up Data:
1. Go to System Settings tab
2. Click "Backup Database" button
3. ZIP file automatically downloads
4. Contains all important databases

### Resetting System:
1. Go to System Settings tab
2. Click "Reset DB (Careful!)" button
3. Confirm twice (very destructive!)
4. System clears all data except admin user

---

## ⚡ Features Summary

| Feature | Status | Location |
|---------|--------|----------|
| Dashboard | ✅ Complete | Tab 1 |
| User Management | ✅ Complete | Tab 2 |
| Video Management | ✅ Complete | Tab 3 |
| Content Moderation | 🔄 Placeholder | Tab 4 |
| Activity Logs | 🔄 Placeholder | Tab 5 |
| System Settings | ✅ Complete | Tab 6 |
| Admin Control Toggle | ✅ Complete | Settings |
| Backup/Restore | ✅ Complete | Settings |
| Cache Management | ✅ Complete | Settings |
| Database Reset | ✅ Complete | Settings |

---

## 🔔 Future Enhancements

- [ ] Activity logging with timestamps
- [ ] Content moderation queue
- [ ] Automated cleanup tasks
- [ ] Email notifications for admins
- [ ] Two-factor authentication
- [ ] Audit logs
- [ ] Rate limiting configuration
- [ ] API key management

---

## ⚠️ Important Notes

1. **Admin Password**: Change the default admin password immediately
2. **Backups**: Create regular backups before major operations
3. **Reset Database**: This action is permanent and cannot be undone
4. **Sensitive Operations**: Always confirm destructive operations
5. **Performance**: Clear cache periodically for better performance

---

**Last Updated:** January 23, 2026
**Version:** 1.0
**Admin Panel Status:** ✅ FULLY OPERATIONAL
