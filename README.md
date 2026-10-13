# Flickart - MERN eCommerce Project (Flipkart Clone)

This is a Flipkart clone eCommerce project developed using the MERN (MongoDB, Express.js, React.js, Node.js) stack. It's designed to demonstrate the functionality and features of a modern eCommerce website.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Setup](#setup)
- [Usage](#usage)
- [Contributing](#contributing)
- [Environment Variables](#environment-variables)
- [System Design](SYSTEM_DESIGN.md)

## Features

- **User Authentication and Authorization:** Implemented user registration, login, and JWT-based authorization for secure access to user-specific data.
- **Product Catalog:** Display products with categories and provide a search functionality for users to find products easily.
- **Shopping Cart Management:** Allow users to add and remove products from their shopping carts, view cart contents, save later, and proceed to checkout.
- **Checkout:** Cash on Delivery is supported. Local demo payment outcomes are available only in development and test environments.
- **User Order History and Order Management:** Store user order history and provide a user-friendly interface for order management, including order status and tracking.
- **Admin Panel for Product Management:** Admin users can manage product listings, categories, and view orders. Accessible via `/dashboard/admin` route (login required).
- **Responsive Design with Tailwind CSS and Material UI:** Utilize Tailwind CSS and Material UI for responsive and visually appealing user interfaces on both mobile and desktop devices.
- **Password Encryption using Bcrypt:** Securely store user passwords by hashing and salting them using the bcrypt library.
- **Image Storage with Cloudinary:** Store and manage product images using Cloudinary for efficient image storage and retrieval.

## Requirements

Before you begin, ensure you have met the following requirements:

- Node.js and npm installed
- MongoDB instance (local or remote)
- MongoDB instance (local or hosted)
- Cloudinary credentials for product image uploads

## Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/aashish-dhiman/E-Commerce.git
   cd E-Commerce
   ```

2. **Setup the Backend:**
   - Navigate to the backend directory:
     ```sh
     cd backend
     ```
   - Copy `.env.example` to `.env` and set `MONGODB_URI` to your database connection string. `JWT_SECRET` must be a private random value; use at least 32 random bytes in production.
   - Install the dependencies:
     ```sh
     npm install
     ```
   - Start the backend server:
     ```sh
     npm start
     ```

3. **Setup the Frontend:**
   - Navigate to the frontend directory:
     ```sh
     cd ../client
     ```
   - Create a `.env` file and add your environment variables (see the example below).
   - Install the dependencies:
     ```sh
     npm install
     ```
   - Start the frontend development server:
     ```sh
     npm run dev
     ```

4. **Access the Application:**
   - Visit `http://localhost:5173` in your browser. Use `npm run dev` in the backend directory to start both apps during development.

## Environment Variables

### Backend (.env)

```plaintext
PORT=8080
CORS_ORIGINS=https://your-frontend.example
MONGODB_URI=YOUR_MONGODB_BASE_URI/database_name
MONGODB_DATABASE=ecommerce
JWT_SECRET=RANDOM_STRING
CLOUD_NAME=CLOUDINARY_CLOUD_NAME
CLOUD_API_KEY=CLOUDINARY_API_KEY
CLOUD_SECRET=CLOUDINARY_SECRET_KEY
FLIPKART_AFFILIATE_ID=YOUR_FLIPKART_AFFILIATE_TRACKING_ID
FLIPKART_AFFILIATE_TOKEN=YOUR_FLIPKART_AFFILIATE_API_TOKEN
```

### Frontend (.env)

```plaintext
VITE_API=http://localhost:8080
VITE_SERVER_URL=http://localhost:8080
VITE_DEMO_API_URL=https://fakestoreapi.com
```

For MongoDB Atlas, create a database user, allow the backend host in Atlas Network Access, and use the generated `mongodb+srv://` URI as `MONGODB_URI`. URL-encode special characters in the username or password. Keep `.env` files out of source control and never put database credentials in `client/.env`.

For production, set `NODE_ENV=production` and use a 32-byte-or-longer random `JWT_SECRET`. Configure `CORS_ORIGINS` with exact HTTPS origins only when the frontend is hosted separately; same-origin deployments do not require CORS. Set `VITE_SERVER_URL` to the HTTPS API origin only when the API is hosted separately. The API exposes `/health` for deployment health checks and refuses requests with weak auth configuration or fake payment mode. Public registration creates customer accounts only; grant administrator access through a trusted operations process.

### Deploy both apps to Vercel

The root `vercel.json` configures the Vite frontend and Express API as Vercel Services. In the Vercel project settings, select **Services** as the framework, then import this repository from its root directory. `/api/*` requests are routed to the backend and all other requests go to the frontend. Since both services share one origin, the frontend uses relative API URLs by default; set `VITE_SERVER_URL` only when hosting the API on a separate HTTPS origin.

Add these backend environment variables in Vercel for Production and Preview as needed: `NODE_ENV=production`, `MONGODB_URI`, `MONGODB_DATABASE=ecommerce`, and a private `JWT_SECRET` with at least 32 bytes. Add Cloudinary and affiliate credentials only when those features are configured. Allow the Vercel backend to reach the MongoDB Atlas cluster in Atlas Network Access. Do not upload either local `.env` file; `.vercelignore` excludes them.

Vercel Services are currently in beta. Deploying requires a Vercel account and a project configured to use the Services framework.

Production checkout currently supports Cash on Delivery. The card, UPI, and netbanking selections in development are simulations and are deliberately unavailable in production. A real online payment provider and verified webhook flow must be integrated before accepting online payments.

### Flipkart Affiliate product catalog

The product catalog uses the official Affiliate API only when valid Affiliate API access is configured. Register at [Flipkart Affiliate](https://affiliate.flipkart.com/registerme), then generate the tracking ID and API token from the [API Token page](https://affiliate.flipkart.com/api/api-token) after signing in. See the [Affiliate API overview](https://affiliate.flipkart.com/api-docs/af_overview.html), [product API reference](https://affiliate.flipkart.com/api-docs/af_prod_ref.html), and [registration instructions](https://affiliate.flipkart.com/api-docs/af_register.html).

Put the generated values in `backend/.env` only:

```plaintext
FLIPKART_AFFILIATE_ID=your_tracking_id
FLIPKART_AFFILIATE_TOKEN=your_api_token
```

Do not add Affiliate credentials to `client/.env` or commit `backend/.env`. The Affiliate ID and token are sent by the Express backend as `Fk-Affiliate-Id` and `Fk-Affiliate-Token` headers. When either setting is missing, the catalog clearly identifies itself as demo data from Fake Store API. Once credentials are present, upstream authentication or API errors are shown instead of silently falling back to demo data. Affiliate products link to Flipkart using the official product URL; they do not enter the MongoDB-backed checkout flow.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve this project.
# Ritesh_flipkart

## Local demo payments

Cash on Delivery places the order and records payment as due on delivery. Simulated payment outcomes never contact a payment provider and must not be used for real transactions.

For local development without Stripe credentials, set both environment values:

```plaintext
# backend/.env
NODE_ENV=development
PAYMENT_MODE=fake

# client/.env
VITE_PAYMENT_MODE=fake
```

Restart the backend and Vite after changing environment files. Fake payment outcomes are accepted only when `PAYMENT_MODE=fake` and `NODE_ENV` is `development` or `test`; they create local orders and adjust stock using MongoDB data. They do not contact a payment provider or move real money.

# flipkart
