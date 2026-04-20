# Quick Fix - Full Stack Application

A modern, full-stack web application for booking professional home services in Sri Lanka. Built with React frontend and Node.js backend, featuring a beautiful skyblue and white theme with cloud animations.

## 🏗️ Architecture

### Frontend (React)
- **React 18** with functional components and hooks
- **React Router** for navigation
- **Context API** for state management
- **Axios** for API communication
- **FontAwesome** for icons
- **Leaflet** for interactive maps

### Backend (Node.js)
- **Express.js** server
- **MongoDB** with Mongoose ODM
- **JWT** authentication (ready for implementation)
- **PDFKit** for invoice generation
- **Nodemailer** for email notifications
- **WhatsApp Business API** integration

## 🚀 Features

### Frontend Features
- **Responsive Design**: Mobile-first approach
- **Theme Toggle**: Light/Dark mode
- **Interactive Maps**: Location picker with Leaflet
- **Shopping Cart**: Real-time cart management
- **Service Tiers**: Normal/Premium pricing
- **Payment Integration**: Multiple payment methods
- **WhatsApp Integration**: Direct order notifications

### Backend Features
- **RESTful API**: Complete CRUD operations
- **Database Models**: Orders, Services, Contacts
- **PDF Generation**: Professional invoice creation
- **Email Notifications**: Contact form alerts
- **WhatsApp Integration**: Order notifications
- **File Upload**: Image handling (ready)
- **Authentication**: JWT ready for implementation

## 📁 Project Structure

```
quick-fix-app/
├── quick-fix-frontend/          # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/          # React Components
│   │   ├── context/             # React Context
│   │   ├── services/            # API Services
│   │   ├── utils/               # Utility Functions
│   │   └── App.js
│   └── package.json
├── quick-fix-backend/           # Node.js Backend
│   ├── controllers/             # Route Controllers
│   ├── models/                  # MongoDB Models
│   ├── routes/                  # API Routes
│   ├── utils/                   # Utility Functions
│   ├── server.js                # Main Server File
│   └── package.json
└── README.md
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Backend Setup
```bash
cd quick-fix-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Frontend Setup
```bash
cd quick-fix-frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Environment Variables

#### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/quickfix
NODE_ENV=development

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@quickfix.lk

# WhatsApp Configuration
WHATSAPP_TOKEN=your-whatsapp-token
ADMIN_PHONE_NUMBER=+94112345678
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 📊 Database Models

### Order Model
```javascript
{
  orderNumber: String,
  customerInfo: {
    name: String,
    phone: String,
    email: String,
    address: String,
    coordinates: { lat: Number, lng: Number },
    preferredDate: String
  },
  items: [{
    serviceId: String,
    serviceName: String,
    tier: String,
    price: Number,
    quantity: Number
  }],
  total: Number,
  paymentMethod: String,
  status: String,
  whatsappSent: Boolean,
  invoiceGenerated: Boolean
}
```

### Service Model
```javascript
{
  serviceId: String,
  name: String,
  description: String,
  icon: String,
  pricing: {
    normal: Number,
    premium: Number
  },
  features: {
    normal: [String],
    premium: [String]
  },
  category: String,
  isActive: Boolean
}
```

## 🔌 API Endpoints

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get single order
- `PATCH /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Delete order
- `POST /api/orders/:id/resend-whatsapp` - Resend WhatsApp
- `POST /api/orders/:id/regenerate-invoice` - Regenerate invoice

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:serviceId` - Get single service
- `POST /api/services` - Create new service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service
- `GET /api/services/category/:category` - Get by category

### Contact
- `POST /api/contact` - Submit contact form
- `GET /api/contact` - Get all contacts
- `GET /api/contact/:id` - Get single contact
- `PATCH /api/contact/:id/status` - Update status
- `DELETE /api/contact/:id` - Delete contact

## 🎨 Design Features

### Color Scheme
- **Primary**: Skyblue (#87CEEB)
- **Secondary**: Steel Blue (#4682B4)
- **Accent**: Dodger Blue (#1E90FF)
- **Background**: White/Light Gray
- **Text**: Dark Gray/White (theme-based)

### Animations
- Floating cloud animations
- Smooth scroll effects
- Hover animations
- Loading animations
- Fade-in effects

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- **Desktop**: 1200px and above
- **Tablet**: 768px - 1199px
- **Mobile**: Below 768px

## 🔧 Development

### Available Scripts

#### Backend
```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
npm test         # Run tests
```

#### Frontend
```bash
npm start        # Start development server
npm build        # Build for production
npm test         # Run tests
npm eject        # Eject from Create React App
```

### Code Structure
- **Components**: Reusable UI components
- **Context**: Global state management
- **Services**: API communication layer
- **Utils**: Helper functions and utilities

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB database
2. Configure environment variables
3. Deploy to Heroku, Vercel, or AWS
4. Set up domain and SSL

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy to Netlify, Vercel, or AWS S3
3. Configure environment variables
4. Set up custom domain

## 🔒 Security Features

- **CORS** configuration
- **Input validation** and sanitization
- **Rate limiting** (ready for implementation)
- **JWT authentication** (ready for implementation)
- **Environment variable** protection

## 📈 Performance

- **Lazy loading** for components
- **Image optimization** (ready)
- **Code splitting** with React Router
- **Caching** strategies
- **Database indexing**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is created for demonstration purposes. Feel free to use and modify as needed.

## 📞 Support

For support or questions:
- Email: info@quickfix.lk
- Phone: +94 11 234 5678

---

**Quick Fix** - Making home services simple, professional, and reliable in Sri Lanka. # smart-tour-guide
