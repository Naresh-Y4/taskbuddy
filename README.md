# 🚀 TaskBuddy — Smart Task Management App

### ✨ Organize Tasks. Boost Productivity. Stay Focused. ✨

---

## 📌 Overview

TaskBuddy is a modern task management web application that helps users create, organize, prioritize, and track tasks efficiently.

The application provides secure authentication, task tracking, priority management, due-date monitoring, and an attractive responsive user interface designed to improve productivity.

---

## ✨ Features

### 🔐 Authentication & Security

* User Registration
* User Login
* JWT Authentication
* Refresh Tokens
* Password Hashing using bcryptjs
* Protected Routes

### ✅ Task Management

* Create Tasks
* View Tasks
* Edit Tasks
* Delete Tasks
* Mark Tasks as Completed

### 🎯 Priority Levels

* 🟢 Low
* 🟡 Medium
* 🟠 High
* 🔴 Urgent

### 📊 Task Status Tracking

* Todo
* In Progress
* Done

### 🏷️ Tags Support

* Add Custom Tags
* Organize Tasks Efficiently

### 📅 Due Date Management

* Due Date Tracking
* Overdue Detection
* Visual Alerts

### 🔍 Search & Filtering

* Real-Time Search
* Filter by Status
* Sort by Priority
* Sort by Due Date

### 🎉 Interactive User Experience

* Confetti Animation on Task Completion
* Smooth UI Animations
* Responsive Design
* Mobile Friendly

---

## 🛠️ Tech Stack

| Layer          | Technology              |
| -------------- | ----------------------- |
| Frontend       | HTML5, CSS3, JavaScript |
| Backend        | Node.js, Express.js     |
| Database       | MySQL                   |
| Authentication | JWT                     |
| Security       | bcryptjs                |
| API Type       | REST API                |

---

## 📂 Project Structure

```bash
TASKAPP/
│
├── backend/
│   │
│   ├── config/
│   │   └── db.js
│   │
│   ├── middleware/
│   │   └── auth.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   └── tasks.js
│   │
│   ├── .env
│   ├── schema.sql
│   └── server.js
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── node_modules/
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```
---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Naresh-Y4/taskbuddy.git
cd taskbuddy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=3001

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=taskbuddy

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

### 4. Create Database

```sql
CREATE DATABASE taskbuddy;
```

Import your SQL file into MySQL.

### 5. Run the Application

```bash
npm start
```

Application will run on:

```bash
http://localhost:3001
```

---

## 🗄️ Database Schema

### Users Table

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);
```

### Tasks Table

```sql
CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    title VARCHAR(255),
    description TEXT,
    priority ENUM('Low','Medium','High','Urgent'),
    status ENUM('Todo','In Progress','Done'),
    due_date DATE,
    tags VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🚀 API Features

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh-token
POST /api/auth/logout
```

### Tasks

```http
GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

---

## 📸 Screenshots

### Login Page

<img width="100%" alt="Login Page" src="https://github.com/user-attachments/assets/26663ae7-a285-4752-ab44-d0a1aae56292" />

### Dashboard

<img width="100%" alt="Dashboard" src="https://github.com/user-attachments/assets/9220cd02-8f97-4b7b-8d58-d813ed21d3f6" />


### Task Management

<img width="100%" alt="Task Management" src="https://github.com/user-attachments/assets/bba7ac5d-b9b1-4cb7-9da1-77e04272c624" />


---

## 🔒 Security Features

* JWT-Based Authentication
* Password Encryption using bcryptjs
* Protected API Routes
* Environment Variable Protection
* Refresh Token Mechanism

---

## 🎯 Future Improvements

* 🌙 Dark Mode
* 👥 Team Collaboration
* 📧 Email Notifications
* 📅 Calendar Integration
* 🎯 Drag & Drop Tasks
* 🤖 AI Task Suggestions
* ⚡ Real-Time Updates with WebSockets

---

## 👨‍💻 Developer

**Naresh Y**

Integrated M.Tech Software Engineering
VIT Vellore

GitHub: https://github.com/Naresh-Y4

LinkedIn: https://linkedin.com/in/naresh-y-491577331

---

## ⭐ Contributing

Contributions, issues, and feature requests are welcome.

If you like this project:

⭐ Star the repository

🍴 Fork the repository

🚀 Create amazing improvements

---

<div align="center">

### 🚀 Built with ❤️ by Naresh Y

"Productivity is not about doing more. It's about doing what matters."

</div>
