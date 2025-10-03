# GenomiVisual - Genomic Data Visualization Platform

## 📋 Project Overview

GenomiVisual is a comprehensive web-based platform for genomic data visualization and analysis. It provides an intuitive interface for researchers and scientists to upload, process, and visualize various types of genomic data through interactive charts and 3D visualizations.

## 🏗️ Architecture

The project follows a **client-server architecture** with:
- **Frontend**: React.js application with modern UI components
- **Backend**: Node.js/Express.js server with MongoDB database
- **Authentication**: Firebase Authentication
- **Visualization**: Plotly.js for interactive charts and 3D visualizations

## 📁 Project Structure

```
GenomiVisual/
├── client/                 # React frontend application
├── server/                 # Node.js backend server
├── data_files/            # Sample genomic data files
├── .env                   # Environment variables
├── .gitignore            # Git ignore rules
└── PROJECT_DOCUMENTATION.md
```

---

## 🎨 Frontend (Client)

### 📦 Technology Stack
- **React 19.1.0** - Modern UI framework
- **React Router DOM 7.5.1** - Client-side routing
- **Plotly.js 3.0.1** - Interactive data visualization
- **Firebase 11.6.1** - Authentication and cloud services
- **Axios 1.8.4** - HTTP client for API calls
- **FontAwesome 6.7.2** - Icon library

### 🧩 Core Components

#### **App.js** (1,753 bytes)
- **Purpose**: Main application component and routing configuration
- **Functionality**: 
  - Sets up React Router for navigation
  - Defines protected routes and authentication flow
  - Manages global application state

#### **Authentication Components**

##### **Auth.js** (7,046 bytes)
- **Purpose**: User authentication (login/register)
- **Features**:
  - Firebase authentication integration
  - Form validation and error handling
  - Social login options
  - Password strength validation

##### **ResetPassword.js** (5,478 bytes)
- **Purpose**: Password reset functionality
- **Features**:
  - Email-based password reset
  - Secure token validation
  - User-friendly error messages

#### **Dashboard & Navigation**

##### **Dashboard.js** (3,304 bytes)
- **Purpose**: Main user dashboard after login
- **Features**:
  - Project overview and statistics
  - Quick access to visualization tools
  - Recent activity display

##### **Navbar.js** (7,279 bytes)
- **Purpose**: Navigation bar component
- **Features**:
  - Responsive navigation menu
  - User profile dropdown
  - Authentication status display
  - Mobile-friendly hamburger menu

#### **User Management**

##### **Profile.js** (13,023 bytes)
- **Purpose**: User profile management
- **Features**:
  - Profile information editing
  - Avatar upload functionality
  - Account settings management
  - Activity history

##### **Notifications.js** (6,195 bytes)
- **Purpose**: User notification system
- **Features**:
  - Real-time notifications
  - Notification history
  - Mark as read functionality

##### **RecentActivity.js** (12,881 bytes)
- **Purpose**: Display user's recent activities
- **Features**:
  - Activity timeline
  - Filtering and search
  - Activity type categorization

#### **Visualization Engine**

##### **VisualizationTool.js** (75,931 bytes) - **CORE COMPONENT**
- **Purpose**: Main visualization authoring tool
- **Features**:
  - **5-Step Workflow**:
    1. Upload Data (multiple file formats)
    2. Customize (dataset relationships)
    3. Select Columns (intelligent column mapping)
    4. Choose Type (20+ visualization types)
    5. Visualize (interactive rendering)
  
  - **Supported File Formats**:
    - CSV (Comma-separated values)
    - BED (Browser Extensible Data)
    - VCF (Variant Call Format)
    - FASTA (DNA/protein sequences)
    - GTF (Gene Transfer Format)
  
  - **2D Visualizations**:
    - Bar Chart, Line Chart, Scatter Plot
    - Heatmap, Histogram, Box Plot, Violin Plot
    - Manhattan Plot, Volcano Plot, Lollipop Plot
    - PCA Plot, t-SNE Plot, Circos Plot
  
  - **3D Visualizations**:
    - 3D Scatter Plot, 3D Bubble Plot
    - 3D Surface Plot, 3D Mesh Plot
    - 3D Volume Plot, 3D Line/Trajectory Plot
    - 3D Network Visualization
  
  - **Advanced Features**:
    - Multi-dimensional data encoding (color, size, hover)
    - Interactive 3D rotation and zooming
    - Export functionality (PNG, JSON, HTML, Python, R)
    - Real-time data processing

##### **Wizard Components**

##### **WizardStep1.js** (7,828 bytes)
- **Purpose**: File upload interface
- **Features**:
  - Multi-file upload (up to 3 files)
  - Drag-and-drop functionality
  - File format validation
  - Progress indicators

##### **WizardStep2.js** (5,345 bytes)
- **Purpose**: Visualization type selection
- **Features**:
  - Categorized visualization options
  - Visual previews and descriptions
  - Search and filter functionality
  - Responsive grid layout

##### **WizardStep3.js** (23,781 bytes)
- **Purpose**: Dataset customization and relationships
- **Features**:
  - Common column detection
  - Primary key selection for merging
  - Dataset relationship analysis
  - Merge mode configuration

##### **WizardStepColumnSelection.js** (15,098 bytes)
- **Purpose**: Intelligent column selection
- **Features**:
  - Column statistics and data type analysis
  - Bulk selection controls
  - Common column highlighting
  - Visual column cards with metadata

##### **WizardStep4.js** (3,917 bytes)
- **Purpose**: Export and finalization
- **Features**:
  - Multiple export formats
  - Custom visualization options
  - Share functionality

##### **CustomVisualization.js** (10,989 bytes)
- **Purpose**: Advanced customization interface
- **Features**:
  - Custom chart configuration
  - Advanced styling options
  - Interactive parameter tuning

### 🎨 Styling (styles/)
- **visualization.css** - Main visualization styling
- **auth.css** - Authentication component styles
- **dashboard.css** - Dashboard layout styles
- **profile.css** - User profile styling
- **responsive.css** - Mobile responsiveness

---

## 🖥️ Backend (Server)

### 📦 Technology Stack
- **Node.js** - JavaScript runtime
- **Express.js 5.1.0** - Web framework
- **MongoDB 6.15.0** - NoSQL database
- **Firebase Admin 13.3.0** - Server-side Firebase integration
- **JWT 9.0.2** - JSON Web Tokens for authentication
- **Multer 1.4.5** - File upload handling
- **bcryptjs 3.0.2** - Password hashing

### 🗂️ Server Structure

#### **server.js** (12,514 bytes) - **MAIN SERVER FILE**
- **Purpose**: Express server configuration and startup
- **Features**:
  - CORS configuration
  - Middleware setup
  - Route registration
  - Database connection
  - File upload handling
  - Error handling

#### **Configuration (config/)**
- **database.js** - MongoDB connection configuration
- **firebase.js** - Firebase Admin SDK setup

#### **Middleware (middleware/)**
- **auth.js** - Authentication middleware
- **validation.js** - Request validation
- **upload.js** - File upload processing

#### **Models (models/)**
- **User.js** - User data model
- **Project.js** - Project/visualization model
- **Activity.js** - User activity tracking

#### **Routes (routes/)**
- **auth.js** - Authentication endpoints
- **users.js** - User management endpoints
- **visualizations.js** - Visualization data endpoints

#### **Utilities (utils/)**
- **fileParser.js** - Genomic file parsing utilities
- **dataProcessor.js** - Data transformation functions

---

## 🧬 Genomic Data Support

### **Supported File Formats**

#### **CSV (Comma-Separated Values)**
- **Use Case**: General tabular data, expression matrices
- **Processing**: Automatic delimiter detection, header parsing
- **Features**: Multi-column support, data type inference

#### **BED (Browser Extensible Data)**
- **Use Case**: Genomic intervals, gene annotations
- **Processing**: Region parsing, coordinate extraction
- **Features**: Chromosome-based visualization

#### **VCF (Variant Call Format)**
- **Use Case**: Genetic variants, SNPs, indels
- **Processing**: Variant extraction, depth analysis
- **Features**: Quality score visualization, allele frequency

#### **FASTA (DNA/Protein Sequences)**
- **Use Case**: Sequence data, genome assemblies
- **Processing**: Sequence length analysis, composition
- **Features**: Multi-sequence support, statistics

#### **GTF (Gene Transfer Format)**
- **Use Case**: Gene annotations, transcript structures
- **Processing**: Feature extraction, gene counting
- **Features**: Hierarchical gene structure visualization

---

## 🎯 Key Features

### **Multi-File Analysis**
- Upload up to 3 files simultaneously
- Automatic common column detection
- Dataset merging and relationship analysis

### **Intelligent Column Mapping**
- **3 columns** → X, Y, Z axes for 3D plots
- **4 columns** → X, Y, Z + color mapping
- **5 columns** → X, Y, Z + color + size mapping
- **6+ columns** → Full dimensional encoding with hover tooltips

### **Advanced Visualizations**
- **20+ Chart Types** across multiple categories
- **Interactive 3D Visualizations** with rotation and zoom
- **Real-time Data Processing** with live updates
- **Export Capabilities** in multiple formats

### **User Experience**
- **5-Step Guided Workflow** for ease of use
- **Responsive Design** for all devices
- **Real-time Validation** and error handling
- **Progress Indicators** and loading states

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v14 or higher)
- MongoDB database
- Firebase project setup

### **Installation**

#### **Frontend Setup**
```bash
cd client
npm install
npm start
```

#### **Backend Setup**
```bash
cd server
npm install
npm start
```

### **Environment Variables**
- Configure `.env` files in both client and server directories
- Set up Firebase credentials
- Configure MongoDB connection string

---

## 📊 Data Flow

1. **File Upload** → Multi-format parsing → Data validation
2. **Column Selection** → Intelligent mapping → Data processing
3. **Visualization** → Plotly.js rendering → Interactive display
4. **Export** → Multiple format generation → Download/share

---

## 🔧 Development

### **Code Organization**
- **Modular Components** - Reusable React components
- **Separation of Concerns** - Clear frontend/backend separation
- **Error Handling** - Comprehensive error management
- **Performance Optimization** - Efficient data processing

### **Best Practices**
- **Responsive Design** - Mobile-first approach
- **Accessibility** - WCAG compliance
- **Security** - JWT authentication, input validation
- **Scalability** - Modular architecture for growth

---

## 📈 Future Enhancements

- **Machine Learning Integration** - Automated pattern detection
- **Collaborative Features** - Multi-user project sharing
- **Advanced Analytics** - Statistical analysis tools
- **Cloud Storage** - Integrated file management
- **API Integration** - External genomic databases

---

## 🤝 Contributing

This project follows modern web development practices with:
- **Component-based architecture**
- **RESTful API design**
- **Comprehensive error handling**
- **Responsive user interface**
- **Scalable data processing**

The codebase is well-structured for maintenance and future enhancements, making it suitable for both research and production environments.
