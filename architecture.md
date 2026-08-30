# Floréa Haven — System Architecture

## 1. Project Overview

**Floréa Haven** is a small e-commerce web application for selling seeds, flowers, and perfumes. The system allows customers to browse products, search and filter items, manage a shopping cart, place orders, and view their order history. Administrators can manage products, inventory, customers, and orders.

The architecture is intentionally kept simple and suitable for a student project while following a clear separation between the frontend, backend, and database.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js | Build the interactive user interface |
| Styling | Tailwind CSS | Responsive and aesthetic UI styling |
| Backend | Node.js + Express.js | REST API and server-side business logic |
| Database | PostgreSQL | Store users, products, orders, and related data |
| Hosting | Vercel | Deploy the web application |
| API Communication | REST API / JSON | Communication between React and Node.js |
| Authentication | JWT | Secure user authentication and authorization |
| Version Control | Git + GitHub | Source-code management and collaboration |

> **Note:** Express.js is used as the Node.js backend framework. PostgreSQL should be hosted using a managed PostgreSQL provider compatible with the deployment environment if Vercel's serverless environment is used.

---

## 3. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │       Customer       │
                         │      / Admin         │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      React.js        │
                         │    + Tailwind CSS    │
                         │      Frontend        │
                         └──────────┬───────────┘
                                    │
                              HTTPS / REST
                               JSON Requests
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Node.js + Express  │
                         │      REST API        │
                         └──────────┬───────────┘
                                    │
                                    │ SQL / ORM
                                    ▼
                         ┌──────────────────────┐
                         │     PostgreSQL       │
                         │       Database       │
                         └──────────────────────┘
```

---

## 4. Frontend Architecture

The React application is responsible for the user interface and client-side interactions.

### Main Frontend Modules

```text
src/
├── components/
│   ├── Navbar
│   ├── Footer
│   ├── ProductCard
│   ├── ProductGrid
│   ├── SearchBar
│   └── CartItem
│
├── pages/
│   ├── Home
│   ├── Products
│   ├── ProductDetails
│   ├── Cart
│   ├── Checkout
│   ├── Orders
│   ├── Login
│   ├── Register
│   └── Admin
│
├── layouts/
│   ├── CustomerLayout
│   └── AdminLayout
│
├── services/
│   └── api
│
├── context/
│   ├── AuthContext
│   └── CartContext
│
├── hooks/
│
├── utils/
│
└── App.jsx
```

### Frontend Responsibilities

- Display products and categories.
- Provide product search and filtering.
- Manage the shopping cart.
- Handle customer authentication.
- Submit checkout information.
- Display order history and status.
- Provide an admin interface.
- Communicate with the backend REST API.
- Provide responsive styling using Tailwind CSS.

---

## 5. Backend Architecture

The Node.js backend provides the REST API and contains the application's business logic.

A simple layered structure is recommended:

```text
server/
├── controllers/
│   ├── authController
│   ├── productController
│   ├── categoryController
│   ├── cartController
│   └── orderController
│
├── routes/
│   ├── authRoutes
│   ├── productRoutes
│   ├── categoryRoutes
│   ├── cartRoutes
│   └── orderRoutes
│
├── middleware/
│   ├── authMiddleware
│   ├── adminMiddleware
│   └── errorMiddleware
│
├── models/
│
├── config/
│   └── database
│
├── utils/
│
└── server.js
```

### Backend Responsibilities

- Receive and validate API requests.
- Authenticate users.
- Authorize administrator functions.
- Retrieve and modify product data.
- Manage inventory.
- Create and update orders.
- Validate checkout information.
- Communicate with PostgreSQL.
- Return JSON responses to the React frontend.
- Handle API errors consistently.

---

## 6. REST API Structure

The API can be organized around the main resources of the application.

### Authentication

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

### Products

```text
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

### Categories

```text
GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

### Cart

```text
GET    /api/cart
POST   /api/cart/items
PUT    /api/cart/items/:id
DELETE /api/cart/items/:id
```

### Orders

```text
POST   /api/orders
GET    /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id/status
```

Administrator-only endpoints should be protected using authentication and role-based authorization middleware.

---

## 7. Database Architecture

PostgreSQL will store the application's persistent data.

### Main Tables

```text
users
├── id
├── name
├── email
├── password_hash
├── role
└── created_at

categories
├── id
├── name
└── description

products
├── id
├── category_id
├── name
├── description
├── price
├── stock_quantity
├── image_url
└── created_at

cart_items
├── id
├── user_id
├── product_id
└── quantity

orders
├── id
├── user_id
├── total_amount
├── status
├── delivery_address
└── created_at

order_items
├── id
├── order_id
├── product_id
├── quantity
└── price
```

### Basic Relationships

```text
users
  │
  ├──────────< cart_items >────────── products
  │                                      │
  │                                      │
  └──────────< orders >──────< order_items
                                  │
                                  └──── products

categories
  │
  └──────────< products
```

The `price` stored in `order_items` represents the product price at the time the order was placed. This prevents historical orders from changing when a product's current price is updated.

---

## 8. Authentication and Authorization

The application will use JWT-based authentication.

### Customer Flow

```text
Register/Login
      │
      ▼
Backend validates credentials
      │
      ▼
JWT generated
      │
      ▼
Frontend stores authentication state
      │
      ▼
JWT included with protected API requests
```

### Roles

Two basic roles are sufficient:

- **Customer** — browse products, manage cart, place orders, and view their own orders.
- **Admin** — manage products, categories, inventory, and customer orders.

Passwords must never be stored as plain text. They should be hashed before being stored in PostgreSQL.

---

## 9. Main Application Flow

### Product Browsing

```text
Customer
   │
   ▼
React Products Page
   │
   ▼
GET /api/products
   │
   ▼
Node.js / Express
   │
   ▼
PostgreSQL
   │
   ▼
Product Data
   │
   ▼
React Product Cards
```

### Checkout

```text
Customer
   │
   ▼
Shopping Cart
   │
   ▼
Checkout
   │
   ▼
POST /api/orders
   │
   ▼
Backend validates stock
   │
   ▼
Create Order + Order Items
   │
   ▼
Update Product Stock
   │
   ▼
PostgreSQL
   │
   ▼
Order Confirmation
```

---

## 10. Deployment Architecture

Vercel will be used for deployment.

```text
                         Internet
                            │
                            ▼
                    ┌───────────────┐
                    │    Vercel     │
                    │               │
                    │ React Frontend│
                    └───────┬───────┘
                            │
                            │ HTTPS / REST
                            ▼
                    ┌───────────────┐
                    │ Node.js API   │
                    │ / Serverless  │
                    │ Functions     │
                    └───────┬───────┘
                            │
                            │ Secure DB Connection
                            ▼
                    ┌───────────────┐
                    │  PostgreSQL   │
                    │ Managed DB    │
                    └───────────────┘
```

### Environment Variables

Sensitive configuration should be stored as environment variables rather than committed to Git.

Example:

```text
DATABASE_URL=...
JWT_SECRET=...
```

The actual values must not be placed in the source code or committed to GitHub.

---

## 11. Security Considerations

The project only needs basic security appropriate for a student e-commerce application:

- Hash user passwords.
- Use JWT authentication for protected requests.
- Protect admin routes with role-based authorization.
- Validate user input on the backend.
- Use parameterized queries or an ORM to prevent SQL injection.
- Never expose database credentials to the frontend.
- Use HTTPS in production.
- Store secrets in environment variables.
- Validate product stock before creating an order.

---

## 12. Recommended Project Structure

A simple repository structure can be:

```text
florea-haven/
│
├── client/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── models/
│   ├── config/
│   ├── server.js
│   └── package.json
│
├── .gitignore
├── README.md
└── package.json
```

---

## 13. Scope Control

To keep the project feasible, the first version should focus on:

- Product catalog
- Product categories
- Search and filtering
- User registration and login
- Shopping cart
- Checkout
- Order history
- Order status
- Inventory management
- Admin product management

The following are **not required** for the initial student-project version:

- AI product recommendations
- Real-time courier GPS tracking
- Complex payment gateway integrations
- Microservices
- Real-time chat
- Advanced analytics
- Multiple external APIs
- Automated delivery integration

These can be added later if there is enough development time, ensure scalability and maintainability.

---

## 14. Architecture Summary

Floréa Haven follows a straightforward **three-layer architecture**:

1. **Presentation Layer** — React + Tailwind CSS provides the customer and administrator interfaces.
2. **Application Layer** — Node.js + Express.js handles authentication, business logic, validation, and REST API requests.
3. **Data Layer** — PostgreSQL stores users, products, inventory, carts, and orders.

This architecture is simple enough for a student project while remaining organized, maintainable, and suitable for deployment through Vercel.
