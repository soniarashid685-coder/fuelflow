import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema, insertStationSchema, insertProductSchema, insertTankSchema,
  insertCustomerSchema, insertSupplierSchema, insertSalesTransactionSchema,
  insertSalesTransactionItemSchema, insertPurchaseOrderSchema, insertPurchaseOrderItemSchema,
  insertExpenseSchema, insertPaymentSchema, insertStockMovementSchema, insertSettingsSchema,
  insertPumpSchema, insertPumpReadingSchema
} from "@shared/schema";
import bcrypt from "bcrypt";
import { requireAuth, requireRole, requireStationAccess, generateToken, verifyFirebaseToken, AuthenticatedUser } from "./auth";
import { eq, and, gte, lte, desc, sum, count, case as sqlCase, sql, gt } from "drizzle-orm";
import { db } from "./db";
import { accounts, expenses, products, salesTransactions, salesTransactionItems, customers, suppliers, purchaseOrders, payments, settings } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {

  // Admin routes (admin only)
  app.get("/api/admin/users", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: "Failed to fetch users", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/admin/users", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const userData = { ...validatedData, password: hashedPassword };
      const user = await storage.createUser(userData);
      // Remove password from response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.put("/api/admin/users/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertUserSchema.partial().parse(req.body);

      // Hash password if provided
      if (validatedData.password) {
        validatedData.password = await bcrypt.hash(validatedData.password, 10);
      }

      const user = await storage.updateUser(id, validatedData);
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('User update error:', error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Signup route (unprotected)
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Admin users are automatically active, others need approval
      const isActive = validatedData.role === 'admin';

      const userData = {
        ...validatedData,
        password: hashedPassword,
        isActive
      };
      const user = await storage.createUser(userData);

      // Remove password from response
      const { password, ...safeUser } = user;

      if (isActive) {
        res.status(201).json({
          user: safeUser,
          message: "Admin account created successfully. You can now login."
        });
      } else {
        res.status(201).json({
          user: safeUser,
          message: "Account created successfully. Please wait for admin approval."
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Authentication routes (unprotected)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Admin users can always login, others need approval
      if (!user.isActive && user.role !== 'admin') {
        return res.status(401).json({ message: "Account pending approval. Please contact administrator." });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Remove password from response and generate token
      const { password: _, ...userWithoutPassword } = user;
      const authUser: AuthenticatedUser = {
        id: userWithoutPassword.id,
        username: userWithoutPassword.username,
        fullName: userWithoutPassword.fullName,
        role: userWithoutPassword.role,
        stationId: userWithoutPassword.stationId || undefined,
        isGoogleAuth: false
      };

      const token = generateToken(authUser);
      res.json({ user: authUser, token });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ message: "Firebase ID token required" });
      }

      const decodedToken = await verifyFirebaseToken(idToken);
      if (!decodedToken) {
        return res.status(401).json({ message: "Invalid Firebase token" });
      }

      // Check if user exists in database
      let user = await storage.getUserByUsername(decodedToken.email || decodedToken.uid);

      if (!user) {
        // Create new user for Google sign-in
        const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10); // Random password for Google users
        const newUser = {
          username: decodedToken.email || decodedToken.uid,
          password: hashedPassword,
          fullName: decodedToken.name || decodedToken.email || 'Google User',
          role: 'cashier' as const, // Default role for Google users
          isActive: true
        };

        user = await storage.createUser(newUser);
      }

      // Create authenticated user object
      const authUser: AuthenticatedUser = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        stationId: user.stationId || undefined,
        email: decodedToken.email,
        isGoogleAuth: true
      };

      const token = generateToken(authUser);
      res.json({ user: authUser, token });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ message: "Google authentication failed" });
    }
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, (req, res) => {
    if (req.user) {
      res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role,
        stationId: req.user.stationId,
        isGoogleAuth: req.user.isGoogleAuth,
        // Add responsive flag for mobile clients
        preferences: {
          sidebarCollapsed: false,
          mobileLayout: true
        }
      });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Protected routes (require authentication)
  // Stations routes
  app.get("/api/stations", requireAuth, async (req, res) => {
    try {
      const stations = await storage.getStations();
      res.json(stations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stations" });
    }
  });

  app.post("/api/stations", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertStationSchema.parse(req.body);
      const station = await storage.createStation(validatedData);
      res.status(201).json(station);
    } catch (error) {
      res.status(400).json({ message: "Invalid station data" });
    }
  });

  app.get("/api/stations/:id", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { id } = req.params;
      const station = await storage.getStation(id);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      res.json(station);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch station" });
    }
  });

  app.put("/api/stations/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertStationSchema.partial().parse(req.body);
      const station = await storage.updateStation(id, validatedData);
      res.json(station);
    } catch (error) {
      res.status(400).json({ message: "Invalid station data" });
    }
  });

  // Settings routes
  app.get("/api/settings/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const settings = await storage.getSettings(stationId);
      if (!settings) {
        // Return default settings if none exist
        const defaultSettings = {
          stationId,
          taxEnabled: false,
          taxRate: '0',
          currencyCode: 'PKR' as const,
        };
        return res.json(defaultSettings);
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings/:stationId", requireAuth, requireRole(['admin', 'manager']), requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      // Ensure stationId comes from URL params, not body
      const { stationId: _, ...bodyData } = req.body;
      const validatedData = insertSettingsSchema.parse({ ...bodyData, stationId });

      try {
        const settings = await storage.createSettings(validatedData);
        res.status(201).json(settings);
      } catch (error: any) {
        // Handle unique constraint violation - settings already exist
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          const existingSettings = await storage.getSettings(stationId);
          if (existingSettings) {
            return res.status(409).json({
              message: "Settings already exist for this station. Use PUT to update.",
              settings: existingSettings
            });
          }
        }
        throw error;
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  app.put("/api/settings/:stationId", requireAuth, requireRole(['admin', 'manager']), requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      // Ensure stationId comes from URL params, not body
      const { stationId: _, ...bodyData } = req.body;
      const validatedData = insertSettingsSchema.partial().parse(bodyData);
      const settings = await storage.updateSettings(stationId, validatedData);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  // Pumps routes
  app.get("/api/pumps", requireAuth, async (req, res) => {
    try {
      const { stationId } = req.query;
      if (!stationId) {
        return res.status(400).json({ message: "Station ID is required" });
      }
      const pumps = await storage.getPumpsByStation(stationId as string);
      res.json(pumps);
    } catch (error) {
      console.error('Error fetching pumps:', error);
      res.status(500).json({ message: "Failed to fetch pumps" });
    }
  });

  app.post("/api/pumps", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      console.log('Creating pump with data:', req.body);
      const validatedData = insertPumpSchema.parse(req.body);
      const pump = await storage.createPump(validatedData);
      res.status(201).json(pump);
    } catch (error) {
      console.error('Error creating pump:', error);
      res.status(400).json({ message: "Invalid pump data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put("/api/pumps/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertPumpSchema.partial().parse(req.body);
      const pump = await storage.updatePump(id, validatedData);
      res.json(pump);
    } catch (error) {
      console.error('Error updating pump:', error);
      res.status(400).json({ message: "Invalid pump data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/pumps/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePump(id);
      res.json({ message: "Pump deleted successfully" });
    } catch (error) {
      console.error('Error deleting pump:', error);
      res.status(500).json({ message: "Failed to delete pump" });
    }
  });

  // Pump readings routes
  app.get("/api/pump-readings", requireAuth, async (req, res) => {
    try {
      const { stationId } = req.query;
      if (!stationId) {
        return res.status(400).json({ message: "Station ID is required" });
      }
      const readings = await storage.getPumpReadingsByStation(stationId as string);
      res.json(readings);
    } catch (error) {
      console.error('Error fetching pump readings:', error);
      res.status(500).json({ message: "Failed to fetch pump readings" });
    }
  });

  app.post("/api/pump-readings", requireAuth, async (req, res) => {
    try {
      console.log('Creating pump reading with data:', req.body);
      const validatedData = insertPumpReadingSchema.parse(req.body);
      const reading = await storage.createPumpReading(validatedData);
      res.status(201).json(reading);
    } catch (error) {
      console.error('Error creating pump reading:', error);
      res.status(400).json({ message: "Invalid pump reading data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Products routes
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.delete("/api/products/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProduct(id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Price Management endpoints
  app.put('/api/products/:id', requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const productId = req.params.id;
      const updateData = req.body;

      // Get existing product for price history tracking
      const existingProduct = await storage.getProduct(productId);

      if (updateData.currentPrice && existingProduct && existingProduct.currentPrice !== updateData.currentPrice) {
        // Log price change for history
        console.log(`Price updated for ${existingProduct.name}: ${existingProduct.currentPrice} -> ${updateData.currentPrice}`);
      }

      const product = await storage.updateProduct(productId, updateData);
      res.json(product);
    } catch (error) {
      console.error('Product update error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  // Bulk price update endpoint
  app.post('/api/products/bulk-update', requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { productIds, updateType, value } = req.body;

      if (!productIds || !Array.isArray(productIds) || !updateType || !value) {
        return res.status(400).json({ error: 'Invalid bulk update parameters' });
      }

      const updates = [];

      for (const productId of productIds) {
        const product = await storage.getProduct(productId);

        if (product) {
          let newPrice;
          const currentPrice = parseFloat(product.currentPrice || '0');

          if (updateType === 'percentage') {
            newPrice = currentPrice * (1 + parseFloat(value) / 100);
          } else {
            newPrice = currentPrice + parseFloat(value);
          }

          const updatedProduct = await storage.updateProduct(productId, {
            currentPrice: newPrice.toFixed(2)
          });

          updates.push(updatedProduct);
        }
      }

      res.json({ message: 'Bulk update completed', updated: updates });
    } catch (error) {
      console.error('Bulk update error:', error);
      res.status(500).json({ error: 'Failed to perform bulk update' });
    }
  });

  // Tanks routes
  app.get("/api/tanks/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const tanks = await storage.getTanksByStation(stationId);
      res.json(tanks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tanks" });
    }
  });

  app.post("/api/tanks", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const validatedData = insertTankSchema.parse(req.body);
      const tank = await storage.createTank(validatedData);
      res.status(201).json(tank);
    } catch (error) {
      res.status(400).json({ message: "Invalid tank data" });
    }
  });

  // Stock Movements routes
  app.get("/api/stock-movements/:tankId", requireAuth, async (req, res) => {
    try {
      const { tankId } = req.params;
      const stockMovements = await storage.getStockMovements(tankId);
      res.json(stockMovements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stock movements" });
    }
  });

  app.post("/api/stock-movements", requireAuth, async (req, res) => {
    try {
      const validatedData = insertStockMovementSchema.parse(req.body);
      const stockMovement = await storage.createStockMovement(validatedData);
      res.status(201).json(stockMovement);
    } catch (error) {
      res.status(400).json({ message: "Invalid stock movement data" });
    }
  });

  // Customers routes
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", requireAuth, async (req, res) => {
    try {
      const customer = await storage.createCustomer(req.body);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.delete("/api/customers/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const user = req.user!;

    try {
      // Check if customer has outstanding transactions
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      if (parseFloat(customer.outstandingAmount || '0') > 0) {
        return res.status(400).json({ error: "Cannot delete customer with outstanding amount" });
      }

      await storage.deleteCustomer(id);
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  app.put("/api/customers/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
      const customer = await storage.updateCustomer(id, req.body);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  // Suppliers routes
  app.get("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const supplier = await storage.createSupplier(req.body);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ error: "Failed to create supplier" });
    }
  });

  app.delete("/api/suppliers/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    try {
      const supplier = await storage.getSupplier(id);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }

      if (parseFloat(supplier.outstandingAmount || '0') > 0) {
        return res.status(400).json({ error: "Cannot delete supplier with outstanding amount" });
      }

      await storage.deleteSupplier(id);
      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  app.put("/api/suppliers/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
      const supplier = await storage.updateSupplier(id, req.body);
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });

  // Sales transactions routes
  app.get("/api/sales/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const { limit } = req.query;
      const sales = await storage.getSalesTransactions(stationId, limit ? parseInt(limit as string) : undefined);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.get("/api/sales/:stationId/recent", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const sales = await storage.getSalesTransactions(stationId, 5); // Get recent 5 sales
      res.json(sales);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent sales" });
    }
  });

  app.get("/api/sales/detail/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      // Try to get the transaction with a simpler approach first
      const sale = await storage.getSalesTransaction(id);
      if (!sale) {
        return res.status(404).json({ message: "Sales transaction not found" });
      }

      // Check access permissions
      if (userRole !== 'admin' && userStationId !== sale.stationId) {
        return res.status(403).json({ message: "Access denied to this transaction" });
      }

      // Get additional details
      const customer = await storage.getCustomer(sale.customerId);
      const user = await storage.getUser(sale.userId);
      const station = await storage.getStation(sale.stationId);
      const items = await storage.getSalesTransactionItems(id);

      const saleWithDetails = {
        ...sale,
        customer,
        user,
        station,
        items
      };

      res.json(saleWithDetails);
    } catch (error) {
      console.error('Sales detail error:', error);
      res.status(500).json({ message: "Failed to fetch sales transaction details" });
    }
  });

  app.put("/api/sales/:transactionId", requireAuth, async (req, res) => {
    const { transactionId } = req.params;
    const { transaction, items } = req.body;
    const user = req.user!;

    try {
      // Get existing transaction to check permissions
      const existingTransaction = await storage.getSalesTransaction(transactionId);
      if (!existingTransaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (user.role !== 'admin' && user.stationId !== existingTransaction.stationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Update transaction
      const updatedTransaction = await storage.updateSalesTransaction(transactionId, transaction);

      // Delete existing items
      await storage.deleteSalesTransactionItems(transactionId);

      // Add new items
      const updatedItems = [];
      for (const item of items) {
        const newItem = await storage.createSalesTransactionItem({
          ...item,
          transactionId: transactionId
        });
        updatedItems.push(newItem);
      }

      res.json({ transaction: updatedTransaction, items: updatedItems });
    } catch (error) {
      console.error("Error updating sale:", error);
      res.status(500).json({ error: "Failed to update sale" });
    }
  });

  app.delete("/api/sales/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      await storage.deleteSalesTransactionSecure(id, userStationId, userRole);
      res.json({ message: "Sales transaction deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Access denied')) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete sales transaction" });
    }
  });

  app.post("/api/sales", requireAuth, async (req, res) => {
    try {
      const { transaction, items } = req.body;

      // Generate a shorter invoice number, similar to purchase invoice
      const invoiceNumber = `SAL${Date.now().toString().slice(-6)}`; // Example: SAL123456

      // Validate transaction data
      const validatedTransaction = insertSalesTransactionSchema.parse({
        ...transaction,
        invoiceNumber: invoiceNumber
      });
      const createdTransaction = await storage.createSalesTransaction(validatedTransaction);

      // Create transaction items
      const createdItems = [];
      for (const item of items) {
        const validatedItem = insertSalesTransactionItemSchema.parse({
          ...item,
          transactionId: createdTransaction.id
        });
        const createdItem = await storage.createSalesTransactionItem(validatedItem);
        createdItems.push(createdItem);

        // Create stock movement for inventory tracking (only for fuel products with tanks)
        if (item.tankId && item.tankId !== 'null') {
          await storage.createStockMovement({
            tankId: item.tankId,
            movementType: "out",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            remarks: `Sale - Invoice ${transaction.invoiceNumber}`,
            referenceType: "sale",
            referenceId: createdTransaction.id,
            stationId: validatedTransaction.stationId,
            userId: validatedTransaction.userId,
          });
        }
      }

      // Update customer outstanding amount for credit sales
      if (validatedTransaction.paymentMethod === 'credit' && validatedTransaction.customerId) {
        await storage.updateCustomerOutstanding(
          validatedTransaction.customerId,
          parseFloat(validatedTransaction.outstandingAmount || '0')
        );
      }

      res.status(201).json({ transaction: createdTransaction, items: createdItems });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        console.error("Sales validation error:", error.message, (error as any).errors);
        return res.status(400).json({
          message: "Validation failed",
          errors: (error as any).errors
        });
      }
      console.error("Sales creation error:", error);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(400).json({ message: "Invalid sales data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Purchase orders routes
  app.get("/api/purchase-orders/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const orders = await storage.getPurchaseOrders(stationId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.get("/api/purchase-orders/detail/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      const order = await storage.getPurchaseOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      // Check access permissions
      if (userRole !== 'admin' && userStationId !== order.stationId) {
        return res.status(403).json({ message: "Access denied to this purchase order" });
      }

      // Get additional details
      const supplier = await storage.getSupplier(order.supplierId);
      const user = await storage.getUser(order.userId);
      const station = await storage.getStation(order.stationId);
      const items = await storage.getPurchaseOrderItems(id);

      // Get products for each item
      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return { ...item, product };
        })
      );

      const orderWithDetails = {
        ...order,
        supplier,
        user,
        station,
        items: itemsWithProducts
      };

      res.json(orderWithDetails);
    } catch (error) {
      console.error('Purchase order detail error:', error);
      res.status(500).json({ message: "Failed to fetch purchase order details" });
    }
  });

  // Print endpoints for different document types
  app.get("/api/sales/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      const sale = await storage.getSalesTransaction(id);
      if (!sale) {
        return res.status(404).json({ message: "Sales transaction not found" });
      }

      if (userRole !== 'admin' && userStationId !== sale.stationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const customer = await storage.getCustomer(sale.customerId);
      const items = await storage.getSalesTransactionItems(id);
      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return { ...item, product };
        })
      );

      res.json({
        ...sale,
        customer,
        items: itemsWithProducts
      });
    } catch (error) {
      console.error('Sales fetch error:', error);
      res.status(500).json({ message: "Failed to fetch sales transaction" });
    }
  });

  app.get("/api/purchase-orders/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      const order = await storage.getPurchaseOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      if (userRole !== 'admin' && userStationId !== order.stationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const supplier = await storage.getSupplier(order.supplierId);
      const items = await storage.getPurchaseOrderItems(id);
      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return { ...item, product };
        })
      );

      res.json({
        ...order,
        supplier,
        items: itemsWithProducts
      });
    } catch (error) {
      console.error('Purchase order fetch error:', error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.get("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      const { db } = require('./db');
      const { expenses } = require('@shared/schema');

      const expense = await db.select().from(expenses).where(eq(expenses.id, id)).then((results: any[]) => results[0]);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      if (userRole !== 'admin' && userStationId !== expense.stationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(expense);
    } catch (error) {
      console.error('Expense fetch error:', error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.get("/api/pump-readings/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      const { db } = require('./db');
      const { pumpReadings, pumps } = require('@shared/schema');

      const reading = await db.select().from(pumpReadings).where(eq(pumpReadings.id, id)).then((results: any[]) => results[0]);
      if (!reading) {
        return res.status(404).json({ message: "Pump reading not found" });
      }

      if (userRole !== 'admin' && userStationId !== reading.stationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get pump and product details
      const pump = await db.select().from(pumps).where(eq(pumps.id, reading.pumpId)).then((results: any[]) => results[0]);
      const product = await storage.getProduct(reading.productId);

      res.json({
        ...reading,
        pump,
        product
      });
    } catch (error) {
      console.error('Pump reading fetch error:', error);
      res.status(500).json({ message: "Failed to fetch pump reading" });
    }
  });

  app.delete("/api/purchase-orders/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      await storage.deletePurchaseOrderSecure(id, userStationId, userRole);
      res.json({ message: "Purchase order deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Access denied')) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete purchase order" });
    }
  });

  app.post("/api/purchase-orders", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { order, items } = req.body;

      // Generate a shorter invoice number, similar to sale invoice
      const invoiceNumber = `PUR${Date.now().toString().slice(-6)}`; // Example: PUR123456

      // Fetch currency configuration based on the station
      const userStationId = req.user?.stationId;
      if (!userStationId) {
        return res.status(400).json({ message: "User station not found." });
      }
      let currencyConfig = await storage.getSettings(userStationId);
      if (!currencyConfig) {
        // Create default settings if they don't exist
        const defaultSettings = {
          stationId: userStationId,
          taxEnabled: false,
          taxRate: '0',
          currencyCode: 'PKR' as const,
        };
        currencyConfig = await storage.createSettings(defaultSettings);
      }

      // Calculate subtotal, tax, and total
      let subtotal = 0;
      const processedItems = items.map((item: any) => {
        const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
        subtotal += itemSubtotal;
        return {
          ...item,
          subtotal: itemSubtotal.toString()
        };
      });

      const taxRate = currencyConfig.taxEnabled ? parseFloat(currencyConfig.taxRate || '0') : 0;
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      // Normalize dates to ISO timestamps
      const orderData = {
        orderNumber: order.orderNumber,
        stationId: userStationId,
        supplierId: order.supplierId,
        userId: req.user?.id,
        orderDate: order.orderDate instanceof Date ? order.orderDate.toISOString() : new Date(order.orderDate).toISOString(),
        expectedDeliveryDate: order.expectedDeliveryDate ?
          (order.expectedDeliveryDate instanceof Date ? order.expectedDeliveryDate.toISOString() : new Date(order.expectedDeliveryDate).toISOString()) : null,
        status: order.status,
        currencyCode: currencyConfig.code,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        notes: order.notes || "",
      };


      const validatedOrder = insertPurchaseOrderSchema.parse(orderData);
      const createdOrder = await storage.createPurchaseOrder(validatedOrder);

      const createdItems = [];
      for (const item of processedItems) {
        const validatedItem = insertPurchaseOrderItemSchema.parse({
          ...item,
          orderId: createdOrder.id
        });
        const createdItem = await storage.createPurchaseOrderItem(validatedItem);
        createdItems.push(createdItem);
      }

      res.status(201).json({ order: createdOrder, items: createdItems });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        console.error("Purchase order validation error:", error.message, (error as any).errors);
        return res.status(400).json({
          message: "Validation failed",
          errors: (error as any).errors
        });
      }
      console.error("Purchase order creation error:", error);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(400).json({ message: "Invalid purchase order data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Expenses routes
  // Chart of Accounts endpoints
  app.get("/api/accounts", async (req, res) => {
    try {
      const { stationId, type } = req.query;

      if (!stationId) {
        return res.status(400).json({ error: "Station ID is required" });
      }

      let query = db
        .select({
          id: accounts.id,
          code: accounts.code,
          name: accounts.name,
          type: accounts.type,
          parentAccountId: accounts.parentAccountId,
          isActive: accounts.isActive,
          isSystem: accounts.isSystem,
        })
        .from(accounts)
        .where(
          and(
            eq(accounts.stationId, stationId as string),
            eq(accounts.isActive, true)
          )
        );

      if (type) {
        query = query.where(eq(accounts.type, type as string));
      }

      const result = await query.orderBy(accounts.code);
      res.json(result);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const accountData = req.body;

      // Validate required fields
      if (!accountData.stationId || !accountData.code || !accountData.name || !accountData.type) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if account code already exists for this station
      const existingAccount = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.stationId, accountData.stationId),
            eq(accounts.code, accountData.code)
          )
        )
        .limit(1);

      if (existingAccount.length > 0) {
        return res.status(400).json({ error: "Account code already exists for this station" });
      }

      const [newAccount] = await db.insert(accounts).values(accountData).returning();
      res.status(201).json(newAccount);
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Get all expenses for a station with account information
  app.get("/api/expenses", async (req, res) => {
    try {
      const { stationId, accountId, dateFrom, dateTo } = req.query;

      if (!stationId) {
        return res.status(400).json({ error: "Station ID is required" });
      }

      let query = db
        .select({
          id: expenses.id,
          description: expenses.description,
          amount: expenses.amount,
          category: expenses.category,
          accountId: expenses.accountId,
          paymentMethod: expenses.paymentMethod,
          expenseDate: expenses.expenseDate,
          receiptNumber: expenses.receiptNumber,
          vendorName: expenses.vendorName,
          notes: expenses.notes,
          stationId: expenses.stationId,
          userId: expenses.userId,
          createdAt: expenses.createdAt,
          account: {
            id: accounts.id,
            code: accounts.code,
            name: accounts.name,
            type: accounts.type,
            parentAccountId: accounts.parentAccountId,
            parentAccount: {
              name: sql<string>`parent_acc.name`,
              code: sql<string>`parent_acc.code`,
            },
          },
        })
        .from(expenses)
        .leftJoin(accounts, eq(expenses.accountId, accounts.id))
        .leftJoin(sql`accounts parent_acc`, sql`parent_acc.id = ${accounts.parentAccountId}`)
        .where(eq(expenses.stationId, stationId as string));

      if (accountId && accountId !== 'all') {
        query = query.where(eq(expenses.accountId, accountId as string));
      }

      if (dateFrom) {
        query = query.where(gte(expenses.expenseDate, new Date(dateFrom as string)));
      }

      if (dateTo) {
        query = query.where(lte(expenses.expenseDate, new Date(dateTo as string)));
      }

      const result = await query.orderBy(desc(expenses.createdAt));
      res.json(result);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.put("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const expenseData = {
        ...req.body,
        amount: parseFloat(req.body.amount).toString(),
        expenseDate: new Date(req.body.expenseDate).toISOString(),
      };
      const validatedData = insertExpenseSchema.partial().parse(expenseData);
      const expense = await storage.updateExpense(id, validatedData);
      res.json(expense);
    } catch (error) {
      console.error('Expense update error:', error);
      res.status(400).json({ message: "Invalid expense data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const userStationId = req.user?.stationId || '';
      const userRole = req.user?.role || '';

      await storage.deleteExpenseSecure(id, userStationId, userRole);
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Access denied')) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      console.log("Creating expense with data:", req.body);

      if (!req.user?.stationId || !req.user?.id) {
        throw new Error("User session not properly loaded");
      }

      const expenseData = {
        ...req.body,
        stationId: req.user.stationId,
        userId: req.user.id,
        amount: parseFloat(req.body.amount).toString(),
        expenseDate: new Date(req.body.expenseDate).toISOString(),
      };

      console.log("Final expense data being sent:", expenseData);

      const validatedData = insertExpenseSchema.parse(expenseData);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      console.error('Expense creation error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        console.error("Expense validation error:", error.message, (error as any).errors);
        return res.status(400).json({
          message: "Validation failed",
          errors: (error as any).errors
        });
      }
      res.status(400).json({ message: "Invalid expense data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Payments routes
  app.get("/api/payments/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const payments = await storage.getPayments(stationId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.delete("/api/payments/:stationId/:id", requireAuth, requireRole(['admin', 'manager']), requireStationAccess, async (req, res) => {
    try {
      const { id, stationId } = req.params;
      await storage.deletePayment(id, stationId);
      res.json({ message: "Payment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment" });
    }
  });

  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      // Validate that user has stationId for security
      if (!req.user.stationId) {
        return res.status(400).json({ message: "User must be assigned to a station to record payments" });
      }

      // Extract only allowed fields from client, ignore userId/stationId
      const { customerId, supplierId, amount, currencyCode, paymentMethod, referenceNumber, notes, type } = req.body;

      // Use server-side attribution from authenticated user
      const paymentData = {
        customerId,
        supplierId,
        amount,
        currencyCode: currencyCode || 'PKR',
        paymentMethod,
        referenceNumber,
        notes,
        type,
        // Server-side attribution - never trust client
        userId: req.user.id,
        stationId: req.user.stationId
      };

      const payment = await storage.createPayment(paymentData);
      res.status(201).json(payment);
    } catch (error) {
      console.error('Payment creation error:', error);
      res.status(400).json({ message: "Invalid payment data" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const stats = await storage.getDashboardStats(stationId);
      console.log('Dashboard stats:', JSON.stringify(stats, null, 2));
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Customer Activities endpoint
  app.get("/api/customer-activities/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const { customerId, activityType, dateRange } = req.query;

      // Mock data for now - in production this would aggregate from multiple tables
      const activities = [
        {
          id: '1',
          customerId: 'customer-1',
          customerName: 'ABC Corporation',
          type: 'sale',
          description: 'Fuel purchase - Petrol 100L',
          amount: 8500,
          balance: 15000,
          date: new Date().toISOString(),
          referenceNumber: 'SAL-001',
          paymentMethod: 'credit',
          status: 'completed'
        },
        {
          id: '2',
          customerId: 'customer-1',
          customerName: 'ABC Corporation',
          type: 'payment',
          description: 'Payment received',
          amount: 5000,
          balance: 10000,
          date: new Date(Date.now() - 86400000).toISOString(),
          referenceNumber: 'PAY-001',
          paymentMethod: 'cash',
          status: 'completed'
        }
      ];

      res.json(activities);
    } catch (error) {
      console.error('Error fetching customer activities:', error);
      res.status(500).json({ error: "Failed to fetch customer activities" });
    }
  });

  // Journal Entries endpoints
  app.get("/api/journal-entries/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;

      // Mock data for now - in production this would come from journalEntries table
      const journalEntries = [
        {
          id: '1',
          entryNumber: 'JE-2024-001',
          entryDate: new Date().toISOString(),
          description: 'Daily sales posting',
          sourceType: 'sale',
          sourceId: 'sales-batch-1',
          totalDebit: '8500.00',
          totalCredit: '8500.00',
          isPosted: true,
          postedAt: new Date().toISOString(),
          createdBy: req.user?.id
        }
      ];

      res.json(journalEntries);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      res.status(500).json({ error: "Failed to fetch journal entries" });
    }
  });

  app.post("/api/journal-entries", requireAuth, async (req, res) => {
    try {
      const journalData = {
        ...req.body,
        stationId: req.user?.stationId,
        createdBy: req.user?.id,
        entryNumber: `JE-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        isPosted: false
      };

      // In production, this would create the journal entry and lines
      const journalEntry = {
        id: Date.now().toString(),
        ...journalData,
        createdAt: new Date().toISOString()
      };

      res.status(201).json(journalEntry);
    } catch (error) {
      console.error('Error creating journal entry:', error);
      res.status(500).json({ error: "Failed to create journal entry" });
    }
  });

  // Reports
  app.get("/api/reports/sales/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const { startDate, endDate } = req.query;

      const report = await storage.getSalesReport(
        stationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate sales report" });
    }
  });

  app.get("/api/reports/financial/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const { startDate, endDate } = req.query;

      const report = await storage.getFinancialReport(
        stationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate financial report" });
    }
  });

  // Daily reports
  app.get("/api/reports/daily/:stationId", async (req, res) => {
    try {
      const { stationId } = req.params;
      const { date } = req.query;

      const reportDate = date ? new Date(date as string) : new Date();
      const startOfDay = new Date(reportDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(reportDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get sales by payment method for the day
      const salesByMethod = await db
        .select({
          paymentMethod: salesTransactions.paymentMethod,
          totalAmount: sum(salesTransactions.totalAmount),
          count: count(),
          currencyCode: salesTransactions.currencyCode,
        })
        .from(salesTransactions)
        .where(
          and(
            eq(salesTransactions.stationId, stationId),
            gte(salesTransactions.transactionDate, startOfDay),
            lte(salesTransactions.transactionDate, endOfDay)
          )
        )
        .groupBy(salesTransactions.paymentMethod, salesTransactions.currencyCode);

      // Get sales by product for the day
      const salesByProduct = await db
        .select({
          productName: products.name,
          quantity: sum(salesTransactionItems.quantity),
          totalAmount: sum(salesTransactionItems.totalPrice),
          currencyCode: salesTransactions.currencyCode,
        })
        .from(salesTransactionItems)
        .innerJoin(salesTransactions, eq(salesTransactionItems.transactionId, salesTransactions.id))
        .innerJoin(products, eq(salesTransactionItems.productId, products.id))
        .where(
          and(
            eq(salesTransactions.stationId, stationId),
            gte(salesTransactions.transactionDate, startOfDay),
            lte(salesTransactions.transactionDate, endOfDay)
          )
        )
        .groupBy(products.name, salesTransactions.currencyCode);

      // Get expenses by category/account for the day
      const expensesByCategory = await db
        .select({
          category: expenses.category,
          accountName: accounts.name,
          totalAmount: sum(expenses.amount),
          count: count(),
          currencyCode: expenses.currencyCode,
        })
        .from(expenses)
        .leftJoin(accounts, eq(expenses.accountId, accounts.id))
        .where(
          and(
            eq(expenses.stationId, stationId),
            gte(expenses.expenseDate, startOfDay),
            lte(expenses.expenseDate, endOfDay)
          )
        )
        .groupBy(expenses.category, accounts.name, expenses.currencyCode);

      // Get receivables data
      const receivablesData = await db
        .select({
          newCredits: sum(sql`CASE 
              WHEN ${salesTransactions.paymentMethod} = 'credit' 
              AND ${salesTransactions.transactionDate} >= ${startOfDay} 
              AND ${salesTransactions.transactionDate} <= ${endOfDay} 
              THEN ${salesTransactions.totalAmount} 
              ELSE 0 
            END`),
          paymentsReceived: sum(sql`CASE 
              WHEN ${payments.type} = 'receivable' 
              AND ${payments.paymentDate} >= ${startOfDay} 
              AND ${payments.paymentDate} <= ${endOfDay} 
              THEN ${payments.amount} 
              ELSE 0 
            END`),
          currencyCode: sql<string>`'PKR'`,
        })
        .from(salesTransactions)
        .leftJoin(payments, eq(payments.stationId, stationId))
        .where(eq(salesTransactions.stationId, stationId));

      // Get current outstanding receivables
      const outstandingReceivables = await db
        .select({
          totalOutstanding: sum(customers.outstandingAmount),
        })
        .from(customers)
        .where(gt(customers.outstandingAmount, '0'));

      // Get payables data
      const payablesData = await db
        .select({
          newPurchases: sum(sql`CASE 
              WHEN ${purchaseOrders.orderDate} >= ${startOfDay} 
              AND ${purchaseOrders.orderDate} <= ${endOfDay} 
              THEN ${purchaseOrders.totalAmount} 
              ELSE 0 
            END`),
          paymentsMade: sum(sql`CASE 
              WHEN ${payments.type} = 'payable' 
              AND ${payments.paymentDate} >= ${startOfDay} 
              AND ${payments.paymentDate} <= ${endOfDay} 
              THEN ${payments.amount} 
              ELSE 0 
            END`),
          currencyCode: sql<string>`'PKR'`,
        })
        .from(purchaseOrders)
        .leftJoin(payments, eq(payments.stationId, stationId))
        .where(eq(purchaseOrders.stationId, stationId));

      // Get current outstanding payables
      const outstandingPayables = await db
        .select({
          totalOutstanding: sum(suppliers.outstandingAmount),
        })
        .from(suppliers)
        .where(gt(suppliers.outstandingAmount, '0'));

      // Get cash flow data (simplified calculation)
      const cashFlowData = {
        openingCash: '0', // This would typically come from previous day's closing
        cashReceipts: salesByMethod.find(s => s.paymentMethod === 'cash')?.totalAmount || '0',
        cashPayments: expensesByCategory
          .filter(e => e.category === 'cash' || e.accountName?.toLowerCase().includes('cash'))
          .reduce((sum, e) => sum + parseFloat(e.totalAmount || '0'), 0).toString(),
        cardReceipts: salesByMethod.find(s => s.paymentMethod === 'card')?.totalAmount || '0',
        bankDeposits: '0', // Would come from actual bank reconciliation
        currencyCode: 'PKR',
      };

      // Calculate closing cash
      const openingCash = parseFloat(cashFlowData.openingCash);
      const receipts = parseFloat(cashFlowData.cashReceipts);
      const payments = parseFloat(cashFlowData.cashPayments);
      cashFlowData.closingCash = (openingCash + receipts - payments).toString();

      // Tax summary (simplified - based on station settings)
      const stationSettings = await db
        .select()
        .from(settings)
        .where(eq(settings.stationId, stationId))
        .limit(1);

      const taxRate = parseFloat(stationSettings[0]?.taxRate || '0') / 100;
      const totalSales = salesByMethod.reduce((sum, s) => sum + parseFloat(s.totalAmount || '0'), 0);
      const gstCollected = (totalSales * taxRate).toString();

      const taxSummary = {
        gstCollected,
        gstPaid: '0', // Would be calculated from purchase GST
        netGst: gstCollected,
        currencyCode: 'PKR',
      };

      const dailyReport = {
        date: reportDate.toISOString().split('T')[0],
        salesByMethod,
        salesByProduct,
        expenses: expensesByCategory,
        receivables: {
          newCredits: receivablesData[0]?.newCredits || '0',
          paymentsReceived: receivablesData[0]?.paymentsReceived || '0',
          outstandingBalance: outstandingReceivables[0]?.totalOutstanding || '0',
          currencyCode: 'PKR',
        },
        payables: {
          newPurchases: payablesData[0]?.newPurchases || '0',
          paymentsMade: payablesData[0]?.paymentsMade || '0',
          outstandingBalance: outstandingPayables[0]?.totalOutstanding || '0',
          currencyCode: 'PKR',
        },
        cashFlow: cashFlowData,
        taxSummary,
      };

      res.json(dailyReport);
    } catch (error) {
      console.error('Error fetching daily report:', error);
      res.status(500).json({ error: "Failed to fetch daily report" });
    }
  });

  app.get("/api/reports/aging/:stationId", requireAuth, requireStationAccess, async (req, res) => {
    try {
      const { stationId } = req.params;
      const { type } = req.query;

      if (!type || (type !== 'receivable' && type !== 'payable')) {
        return res.status(400).json({ message: "Type parameter must be 'receivable' or 'payable'" });
      }

      const report = await storage.getAgingReport(stationId, type as 'receivable' | 'payable');
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate aging report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}