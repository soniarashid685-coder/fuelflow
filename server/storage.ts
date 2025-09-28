import {
  users, stations, products, tanks, customers, suppliers, salesTransactions, salesTransactionItems,
  purchaseOrders, purchaseOrderItems, expenses, payments, stockMovements, priceHistory, settings,
  pumps, pumpReadings, accounts, journalEntries, journalLines,
  type User, type InsertUser, type Station, type InsertStation,
  type Product, type InsertProduct, type Tank, type InsertTank,
  type Customer, type InsertCustomer, type Supplier, type InsertSupplier,
  type SalesTransaction, type InsertSalesTransaction,
  type SalesTransactionItem, type InsertSalesTransactionItem,
  type PurchaseOrder, type InsertPurchaseOrder,
  type PurchaseOrderItem, type InsertPurchaseOrderItem,
  type Expense, type InsertExpense, type Payment, type InsertPayment,
  type StockMovement, type InsertStockMovement,
  type PriceHistory, type InsertPriceHistory,
  type Settings, type InsertSettings,
  type Pump, type PumpReading, type InsertPump, type InsertPumpReading,
  type Account, type InsertAccount, type JournalEntry, type InsertJournalEntry,
  type JournalLine, type InsertJournalLine
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte, sum } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>; // Added getUsers method

  // Stations
  getStation(id: string): Promise<Station | undefined>;
  getStations(): Promise<Station[]>;
  createStation(station: InsertStation): Promise<Station>;
  updateStation(id: string, station: Partial<InsertStation>): Promise<Station>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Tanks
  getTanksByStation(stationId: string): Promise<(Tank & { product: Product })[]>;
  getTank(id: string): Promise<Tank | undefined>;
  createTank(tank: InsertTank): Promise<Tank>;
  updateTankStock(id: string, currentStock: number): Promise<Tank>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  updateCustomerOutstanding(customerId: string, additionalAmount: number): Promise<void>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;
  updateSupplierOutstanding(supplierId: string, additionalAmount: number): Promise<void>;

  // Sales Transactions
  getSalesTransactions(stationId: string, limit?: number): Promise<SalesTransaction[]>;
  getSalesTransaction(id: string): Promise<SalesTransaction | undefined>;
  getSalesTransactionWithItems(id: string): Promise<(SalesTransaction & { items: (SalesTransactionItem & { product: Product })[], customer: Customer, station: Station, user: User }) | undefined>;
  getSalesTransactionWithItemsSecure(id: string, userStationId: string, userRole: string): Promise<(SalesTransaction & { items: (SalesTransactionItem & { product: Product })[], customer: Customer, station: Station, user: User }) | undefined>;
  createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction>;
  updateSalesTransaction(id: string, transaction: Partial<InsertSalesTransaction>): Promise<SalesTransaction>;
  deleteSalesTransaction(id: string): Promise<void>;
  deleteSalesTransactionSecure(id: string, userStationId: string, userRole: string): Promise<void>;
  deleteSalesTransactionItems(transactionId: string): Promise<void>;

  // Sales Transaction Items
  createSalesTransactionItem(item: InsertSalesTransactionItem): Promise<SalesTransactionItem>;
  getSalesTransactionItems(transactionId: string): Promise<SalesTransactionItem[]>;

  // Purchase Orders
  getPurchaseOrders(stationId: string): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined>;
  getPurchaseOrderWithItems(id: string): Promise<(PurchaseOrder & { items: PurchaseOrderItem[], supplier: Supplier, station: Station }) | undefined>;
  getPurchaseOrderWithItemsSecure(id: string, userStationId: string, userRole: string): Promise<(PurchaseOrder & { items: PurchaseOrderItem[], supplier: Supplier, station: Station }) | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  deletePurchaseOrder(id: string): Promise<void>;
  deletePurchaseOrderSecure(id: string, userStationId: string, userRole: string): Promise<void>;

  // Purchase Order Items
  createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem>;

  // Expenses
  getExpenses(stationId: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: string, stationId: string): Promise<void>;
  deleteExpenseSecure(id: string, userStationId: string, userRole: string): Promise<void>;
  updateExpense(id: string, data: any): Promise<Expense>;

  // Payments
  getPayments(stationId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  deletePayment(id: string, stationId: string): Promise<void>;

  // Stock Movements
  getStockMovements(tankId: string): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;

  // Reports and Analytics
  getDashboardStats(stationId: string): Promise<any>;
  getSalesReport(stationId: string, startDate: Date, endDate: Date): Promise<any>;
  getFinancialReport(stationId: string, startDate: Date, endDate: Date): Promise<any>;
  getDailyReport(stationId: string, date: Date): Promise<any>;
  getAgingReport(stationId: string, type: 'receivable' | 'payable'): Promise<any>;

  // Settings
  getSettings(stationId: string): Promise<Settings | undefined>;
  createSettings(settings: InsertSettings): Promise<Settings>;
  updateSettings(stationId: string, settings: Partial<InsertSettings>): Promise<Settings>;

  // Pump Management
  getPumpsByStation(stationId: string): Promise<(Pump & { product?: Product })[]>;
  createPump(data: any): Promise<Pump>;
  updatePump(id: string, data: any): Promise<Pump>;
  deletePump(id: string): Promise<void>;

  // Pump Readings
  getPumpReadingsByStation(stationId: string): Promise<(PumpReading & { pump?: Pump & { product?: Product }; product?: Product })[]>;
  createPumpReading(data: any): Promise<PumpReading>;

  // Ledger System
  getAccountsByStation(stationId: string): Promise<(Account & { parentAccount?: Account })[]>;
  getAccount(id: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, account: Partial<InsertAccount>): Promise<Account>;
  deleteAccount(id: string): Promise<void>;

  getJournalEntriesByStation(stationId: string, limit?: number): Promise<(JournalEntry & { lines: JournalLine[] })[]>;
  getJournalEntry(id: string): Promise<(JournalEntry & { lines: JournalLine[] }) | undefined>;
  createJournalEntry(entry: InsertJournalEntry, lines: InsertJournalLine[]): Promise<JournalEntry>;
  postJournalEntry(id: string): Promise<void>;

  getAccountLedger(accountId: string, fromDate?: Date, toDate?: Date): Promise<any[]>;
  getTrialBalance(stationId: string, asOfDate?: Date): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // Assuming 'db' is available in the class context or passed to the constructor.
  // For simplicity, directly using the imported 'db'. If 'db' needs to be
  // managed by the class, it should be a class member initialized appropriately.
  private db = db;

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await this.db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async getStation(id: string): Promise<Station | undefined> {
    const [station] = await this.db.select().from(stations).where(eq(stations.id, id));
    return station || undefined;
  }

  async getStations(): Promise<Station[]> {
    return await this.db.select().from(stations).where(eq(stations.isActive, true));
  }

  async createStation(insertStation: InsertStation): Promise<Station> {
    const [station] = await this.db.insert(stations).values(insertStation).returning();
    return station;
  }

  async updateStation(id: string, stationData: Partial<InsertStation>): Promise<Station> {
    const [station] = await this.db.update(stations)
      .set(stationData)
      .where(eq(stations.id, id))
      .returning();
    if (!station) throw new Error("Station not found");
    return station;
  }

  async getProducts(): Promise<Product[]> {
    return await this.db.select().from(products).where(eq(products.isActive, true));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await this.db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await this.db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: string, productData: Partial<InsertProduct>): Promise<Product> {
    const [product] = await this.db.update(products)
      .set({ ...productData })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id));
  }

  async getTanksByStation(stationId: string): Promise<(Tank & { product: Product })[]> {
    const result = await this.db
      .select({
        // Tank fields
        id: tanks.id,
        stationId: tanks.stationId,
        name: tanks.name,
        productId: tanks.productId,
        capacity: tanks.capacity,
        currentStock: tanks.currentStock,
        minimumLevel: tanks.minimumLevel,
        status: tanks.status,
        lastRefillDate: tanks.lastRefillDate,
        createdAt: tanks.createdAt,
        // Product fields (nested)
        product: {
          id: products.id,
          name: products.name,
          category: products.category,
          unit: products.unit,
          currentPrice: products.currentPrice,
          density: products.density,
          hsnCode: products.hsnCode,
          taxRate: products.taxRate,
          isActive: products.isActive,
          createdAt: products.createdAt
        }
      })
      .from(tanks)
      .innerJoin(products, eq(tanks.productId, products.id))
      .where(eq(tanks.stationId, stationId));

    return result as (Tank & { product: Product })[];
  }

  async getTank(id: string): Promise<Tank | undefined> {
    const [tank] = await this.db.select().from(tanks).where(eq(tanks.id, id));
    return tank || undefined;
  }

  async createTank(insertTank: InsertTank): Promise<Tank> {
    const [tank] = await this.db.insert(tanks).values(insertTank).returning();
    return tank;
  }

  async updateTankStock(id: string, currentStock: number): Promise<Tank> {
    const [tank] = await this.db.update(tanks)
      .set({ currentStock: currentStock.toString() })
      .where(eq(tanks.id, id))
      .returning();
    return tank;
  }

  async getCustomers(): Promise<Customer[]> {
    return await this.db.select().from(customers).where(eq(customers.isActive, true));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    return result[0];
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const result = await this.db.insert(customers).values(insertCustomer).returning();
    return result[0];
  }

  async updateCustomer(id: string, customerData: Partial<InsertCustomer>): Promise<Customer> {
    const result = await this.db
      .update(customers)
      .set(customerData)
      .where(eq(customers.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error("Customer not found");
    }

    return result[0];
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.db.delete(customers).where(eq(customers.id, id));
  }

  async updateCustomerOutstanding(customerId: string, additionalAmount: number): Promise<void> {
    try {
      const result = await this.db.update(customers)
        .set({
          outstandingAmount: sql`${customers.outstandingAmount} + ${additionalAmount}`
        })
        .where(eq(customers.id, customerId))
        .returning({ id: customers.id });

      if (result.length === 0) {
        throw new Error(`Customer ${customerId} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to update customer outstanding amount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSupplierOutstanding(supplierId: string, additionalAmount: number): Promise<void> {
    try {
      const result = await this.db.update(suppliers)
        .set({
          outstandingAmount: sql`${suppliers.outstandingAmount} + ${additionalAmount}`
        })
        .where(eq(suppliers.id, supplierId))
        .returning({ id: suppliers.id });

      if (result.length === 0) {
        throw new Error(`Supplier ${supplierId} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to update supplier outstanding amount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSuppliers(): Promise<Supplier[]> {
    return await this.db.select().from(suppliers).where(eq(suppliers.isActive, true));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const result = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, id))
      .limit(1);
    return result[0];
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const result = await this.db.insert(suppliers).values(insertSupplier).returning();
    return result[0];
  }

  async updateSupplier(id: string, supplierData: Partial<InsertSupplier>): Promise<Supplier> {
    const result = await this.db
      .update(suppliers)
      .set(supplierData)
      .where(eq(suppliers.id, id))
      .returning();
    if (!result[0]) throw new Error("Supplier not found");
    return result[0];
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.db.delete(suppliers).where(eq(suppliers.id, id));
  }

  async getSalesTransactions(stationId: string, limit = 50): Promise<any[]> {
    // First get the transactions
    const transactions = await this.db.select()
      .from(salesTransactions)
      .where(eq(salesTransactions.stationId, stationId))
      .orderBy(desc(salesTransactions.transactionDate))
      .limit(limit);

    // For each transaction, get its items with product details
    const transactionsWithItems = await Promise.all(
      transactions.map(async (transaction) => {
        const items = await this.db
          .select({
            id: salesTransactionItems.id,
            productId: salesTransactionItems.productId,
            quantity: salesTransactionItems.quantity,
            unitPrice: salesTransactionItems.unitPrice,
            totalPrice: salesTransactionItems.totalPrice,
            product: {
              id: products.id,
              name: products.name,
              category: products.category,
              unit: products.unit,
              currentPrice: products.currentPrice
            }
          })
          .from(salesTransactionItems)
          .innerJoin(products, eq(salesTransactionItems.productId, products.id))
          .where(eq(salesTransactionItems.transactionId, transaction.id));

        return {
          ...transaction,
          items
        };
      })
    );

    return transactionsWithItems;
  }

  async getSalesTransaction(id: string): Promise<SalesTransaction | undefined> {
    const [transaction] = await this.db.select().from(salesTransactions).where(eq(salesTransactions.id, id));
    return transaction || undefined;
  }

  async createSalesTransaction(insertTransaction: InsertSalesTransaction): Promise<SalesTransaction> {
    try {
      const [transaction] = await this.db.insert(salesTransactions).values(insertTransaction).returning();
      return transaction;
    } catch (error) {
      throw new Error(`Failed to create sales transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSalesTransaction(id: string, transaction: Partial<InsertSalesTransaction>): Promise<SalesTransaction> {
    const result = await this.db
      .update(salesTransactions)
      .set(transaction)
      .where(eq(salesTransactions.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error("Transaction not found");
    }

    return result[0];
  }

  async deleteSalesTransaction(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Delete related transaction items first
      await tx.delete(salesTransactionItems).where(eq(salesTransactionItems.transactionId, id));

      // Delete the transaction
      await tx.delete(salesTransactions).where(eq(salesTransactions.id, id));
    });
  }

  async deleteSalesTransactionSecure(id: string, userStationId: string, userRole: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // First verify the transaction belongs to the user's station (unless admin)
      if (userRole !== 'admin') {
        const [transaction] = await tx.select({ stationId: salesTransactions.stationId })
          .from(salesTransactions)
          .where(eq(salesTransactions.id, id));

        if (!transaction) {
          throw new Error('Sales transaction not found');
        }

        if (transaction.stationId !== userStationId) {
          throw new Error('Access denied: Transaction does not belong to your station');
        }
      }

      // Delete related transaction items first
      await tx.delete(salesTransactionItems).where(eq(salesTransactionItems.transactionId, id));

      // Delete the transaction
      const result = await tx.delete(salesTransactions).where(eq(salesTransactions.id, id)).returning({ id: salesTransactions.id });

      if (result.length === 0) {
        throw new Error('Sales transaction not found');
      }
    });
  }

  async deleteSalesTransactionItems(transactionId: string): Promise<void> {
    await this.db
      .delete(salesTransactionItems)
      .where(eq(salesTransactionItems.transactionId, transactionId));
  }

  async createSalesTransactionItem(insertItem: InsertSalesTransactionItem): Promise<SalesTransactionItem> {
    const [item] = await this.db.insert(salesTransactionItems).values(insertItem).returning();
    return item;
  }

  async getSalesTransactionItems(transactionId: string): Promise<SalesTransactionItem[]> {
    const result = await this.db
      .select()
      .from(salesTransactionItems)
      .where(eq(salesTransactionItems.transactionId, transactionId));
    return result;
  }

  async getPurchaseOrders(stationId: string): Promise<PurchaseOrder[]> {
    return await this.db.select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.stationId, stationId))
      .orderBy(desc(purchaseOrders.orderDate));
  }

  async createPurchaseOrder(insertOrder: InsertPurchaseOrder): Promise<PurchaseOrder> {
    try {
      const [order] = await this.db.insert(purchaseOrders).values(insertOrder).returning();
      return order;
    } catch (error) {
      throw new Error(`Failed to create purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createPurchaseOrderItem(insertItem: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    const [item] = await this.db.insert(purchaseOrderItems).values(insertItem).returning();
    return item;
  }

  async getPurchaseOrderItems(orderId: string): Promise<PurchaseOrderItem[]> {
    const result = await this.db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, orderId));
    return result;
  }

  async getExpenses(stationId: string): Promise<Expense[]>{
    return await this.db.select()
      .from(expenses)
      .where(eq(expenses.stationId, stationId))
      .orderBy(desc(expenses.expenseDate));
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await this.db.insert(expenses).values(insertExpense).returning();
    return expense;
  }

  async deleteExpense(id: string, stationId: string): Promise<void> {
    try {
      const result = await this.db.delete(expenses).where(
        and(
          eq(expenses.id, id),
          eq(expenses.stationId, stationId)
        )
      ).returning({ id: expenses.id });

      if (result.length === 0) {
        throw new Error(`Expense ${id} not found or not authorized for station ${stationId}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteExpenseSecure(id: string, userStationId: string, userRole: string): Promise<void> {
    const expense = await this.db.select().from(expenses).where(eq(expenses.id, id)).then(results => results[0]);
    if (!expense) {
      throw new Error('Expense not found');
    }

    if (userRole !== 'admin' && userStationId !== expense.stationId) {
      throw new Error('Access denied to this expense');
    }

    return await this.db.delete(expenses).where(eq(expenses.id, id));
  }

  async updateExpense(id: string, data: any): Promise<Expense> {
    const [expense] = await this.db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
    return expense;
  }

  async getPayments(stationId: string): Promise<Payment[]>{
    return await this.db.select()
      .from(payments)
      .where(eq(payments.stationId, stationId))
      .orderBy(desc(payments.paymentDate));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    try {
      // Start a transaction to ensure atomicity
      const result = await this.db.transaction(async (tx) => {
        // Create the payment record
        const [payment] = await tx.insert(payments).values(insertPayment).returning();

        // Update outstanding amounts based on payment type
        const paymentAmount = parseFloat(payment.amount);

        if (payment.type === 'receivable' && payment.customerId) {
          // Customer payment - reduce customer's outstanding amount
          await tx.update(customers)
            .set({
              outstandingAmount: sql`${customers.outstandingAmount} - ${paymentAmount}`
            })
            .where(eq(customers.id, payment.customerId));
        } else if (payment.type === 'payable' && payment.supplierId) {
          // Supplier payment - reduce supplier's outstanding amount
          await tx.update(suppliers)
            .set({
              outstandingAmount: sql`${suppliers.outstandingAmount} - ${paymentAmount}`
            })
            .where(eq(suppliers.id, payment.supplierId));
        }

        return payment;
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to create payment and update outstanding amounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deletePayment(id: string, stationId: string): Promise<void> {
    try {
      const result = await this.db.delete(payments).where(
        and(
          eq(payments.id, id),
          eq(payments.stationId, stationId)
        )
      ).returning({ id: payments.id });

      if (result.length === 0) {
        throw new Error(`Payment ${id} not found or not authorized for station ${stationId}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStockMovements(tankId: string): Promise<StockMovement[]> {
    return await this.db.select()
      .from(stockMovements)
      .where(eq(stockMovements.tankId, tankId))
      .orderBy(desc(stockMovements.movementDate));
  }

  async createStockMovement(insertMovement: InsertStockMovement): Promise<StockMovement & { updatedTank?: Tank }> {
    return await this.db.transaction(async (tx) => {
      // Get current tank stock
      const [currentTank] = await tx.select().from(tanks).where(eq(tanks.id, insertMovement.tankId));
      if (!currentTank) {
        throw new Error(`Tank ${insertMovement.tankId} not found`);
      }

      const currentStock = parseFloat(currentTank.currentStock || '0');
      const movementQuantity = parseFloat(insertMovement.quantity);

      // Calculate new stock based on movement type
      let newStock: number;
      switch (insertMovement.movementType) {
        case 'in':
          newStock = currentStock + Math.abs(movementQuantity);
          break;
        case 'out':
          newStock = Math.max(0, currentStock - Math.abs(movementQuantity));
          break;
        case 'adjustment':
          // For adjustments, quantity can be positive or negative
          newStock = Math.max(0, currentStock + movementQuantity);
          break;
        case 'transfer':
          // For transfers, this handles the source tank (out)
          newStock = Math.max(0, currentStock - Math.abs(movementQuantity));
          break;
        case 'audit':
          // For audits, the new quantity IS the new stock (not a delta)
          newStock = Math.max(0, Math.abs(movementQuantity));
          break;
        default:
          throw new Error(`Invalid movement type: ${insertMovement.movementType}`);
      }

      // Create stock movement record with correct values
      const movementData = {
        ...insertMovement,
        previousStock: currentStock.toString(),
        newStock: newStock.toString(),
      };

      const [movement] = await tx.insert(stockMovements).values(movementData).returning();

      // Update tank stock and set last refill date if it's an 'in' movement
      const updateData: any = { currentStock: newStock.toString() };
      if (insertMovement.movementType === 'in') {
        updateData.lastRefillDate = new Date();
      }

      const [updatedTank] = await tx.update(tanks)
        .set(updateData)
        .where(eq(tanks.id, insertMovement.tankId))
        .returning();

      return {
        ...movement,
        updatedTank
      };
    });
  }

  async getDashboardStats(stationId: string): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's sales
    const todaysSales = await this.db
      .select({
        totalAmount: sum(salesTransactions.totalAmount),
        count: sql<number>`count(*)`,
      })
      .from(salesTransactions)
      .where(
        and(
          eq(salesTransactions.stationId, stationId),
          gte(salesTransactions.transactionDate, startOfDay)
        )
      );

    // Monthly sales
    const monthlySales = await this.db
      .select({
        totalAmount: sum(salesTransactions.totalAmount),
        count: sql<number>`count(*)`,
      })
      .from(salesTransactions)
      .where(
        and(
          eq(salesTransactions.stationId, stationId),
          gte(salesTransactions.transactionDate, startOfMonth)
        )
      );

    // Outstanding amount from customers
    const outstanding = await this.db
      .select({
        totalOutstanding: sum(customers.outstandingAmount),
      })
      .from(customers);

    return {
      todaysSales: todaysSales[0],
      monthlySales: monthlySales[0],
      outstanding: outstanding[0],
    };
  }

  async getSalesReport(stationId: string, startDate: Date, endDate: Date): Promise<any> {
    return await this.db
      .select({
        date: salesTransactions.transactionDate,
        totalAmount: sum(salesTransactions.totalAmount),
        transactionCount: sql<number>`count(*)`,
      })
      .from(salesTransactions)
      .where(
        and(
          eq(salesTransactions.stationId, stationId),
          gte(salesTransactions.transactionDate, startDate),
          lte(salesTransactions.transactionDate, endDate)
        )
      )
      .groupBy(salesTransactions.transactionDate)
      .orderBy(salesTransactions.transactionDate);
  }

  async getFinancialReport(stationId: string, startDate: Date, endDate: Date): Promise<any> {
    // Revenue
    const revenue = await this.db
      .select({
        totalRevenue: sum(salesTransactions.totalAmount),
      })
      .from(salesTransactions)
      .where(
        and(
          eq(salesTransactions.stationId, stationId),
          gte(salesTransactions.transactionDate, startDate),
          lte(salesTransactions.transactionDate, endDate)
        )
      );

    // Expenses
    const expenseData = await this.db
      .select({
        totalExpenses: sum(expenses.amount),
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.stationId, stationId),
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      );

    return {
      revenue: revenue[0],
      expenses: expenseData[0],
    };
  }

  async getSalesTransactionWithItems(id: string): Promise<(SalesTransaction & { items: (SalesTransactionItem & { product: Product })[], customer: Customer, station: Station, user: User }) | undefined> {
    const transaction = await this.db
      .select()
      .from(salesTransactions)
      .leftJoin(customers, eq(salesTransactions.customerId, customers.id))
      .leftJoin(stations, eq(salesTransactions.stationId, stations.id))
      .leftJoin(users, eq(salesTransactions.userId, users.id))
      .where(eq(salesTransactions.id, id))
      .then(results => results[0]);

    if (!transaction) return undefined;

    // Ensure customer, station, and user exist - if not, the data is inconsistent
    if (!transaction.customers || !transaction.stations || !transaction.users) {
      throw new Error(`Sales transaction ${id} has missing customer, station, or user data`);
    }

    const itemsWithProducts = await this.db
      .select({
        // SalesTransactionItem fields
        id: salesTransactionItems.id,
        transactionId: salesTransactionItems.transactionId,
        productId: salesTransactionItems.productId,
        tankId: salesTransactionItems.tankId,
        quantity: salesTransactionItems.quantity,
        unitPrice: salesTransactionItems.unitPrice,
        totalPrice: salesTransactionItems.totalPrice,
        createdAt: salesTransactionItems.createdAt,
        // Product fields (nested)
        product: {
          id: products.id,
          name: products.name,
          category: products.category,
          unit: products.unit,
          currentPrice: products.currentPrice,
          density: products.density,
          hsnCode: products.hsnCode,
          taxRate: products.taxRate,
          isActive: products.isActive,
          createdAt: products.createdAt
        }
      })
      .from(salesTransactionItems)
      .innerJoin(products, eq(salesTransactionItems.productId, products.id))
      .where(eq(salesTransactionItems.transactionId, id));

    return {
      ...transaction.sales_transactions,
      items: itemsWithProducts as (SalesTransactionItem & { product: Product })[],
      customer: transaction.customers,
      station: transaction.stations,
      user: transaction.users
    };
  }

  async getSalesTransactionWithItemsSecure(id: string, userStationId: string, userRole: string): Promise<(SalesTransaction & { items: (SalesTransactionItem & { product: Product })[], customer: Customer, station: Station, user: User }) | undefined> {
    const transaction = await this.db
      .select()
      .from(salesTransactions)
      .leftJoin(customers, eq(salesTransactions.customerId, customers.id))
      .leftJoin(stations, eq(salesTransactions.stationId, stations.id))
      .leftJoin(users, eq(salesTransactions.userId, users.id))
      .where(eq(salesTransactions.id, id))
      .then(results => results[0]);

    if (!transaction) return undefined;

    // Ensure customer, station, and user exist - if not, the data is inconsistent
    if (!transaction.customers || !transaction.stations || !transaction.users) {
      throw new Error(`Sales transaction ${id} has missing customer, station, or user data`);
    }

    // Security check: verify the transaction belongs to the user's station (admins can access all)
    if (userRole !== 'admin' && transaction.sales_transactions.stationId !== userStationId) {
      throw new Error('Access denied: Transaction does not belong to your station');
    }

    const itemsWithProducts = await this.db
      .select({
        // SalesTransactionItem fields
        id: salesTransactionItems.id,
        transactionId: salesTransactionItems.transactionId,
        productId: salesTransactionItems.productId,
        tankId: salesTransactionItems.tankId,
        quantity: salesTransactionItems.quantity,
        unitPrice: salesTransactionItems.unitPrice,
        totalPrice: salesTransactionItems.totalPrice,
        createdAt: salesTransactionItems.createdAt,
        // Product fields (nested)
        product: {
          id: products.id,
          name: products.name,
          category: products.category,
          unit: products.unit,
          currentPrice: products.currentPrice,
          density: products.density,
          hsnCode: products.hsnCode,
          taxRate: products.taxRate,
          isActive: products.isActive,
          createdAt: products.createdAt
        }
      })
      .from(salesTransactionItems)
      .innerJoin(products, eq(salesTransactionItems.productId, products.id))
      .where(eq(salesTransactionItems.transactionId, id));

    return {
      ...transaction.sales_transactions,
      items: itemsWithProducts as (SalesTransactionItem & { product: Product })[],
      customer: transaction.customers,
      station: transaction.stations,
      user: transaction.users
    };
  }

  async deleteSalesTransaction(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Delete related transaction items first
      await tx.delete(salesTransactionItems).where(eq(salesTransactionItems.transactionId, id));

      // Delete the transaction
      await tx.delete(salesTransactions).where(eq(salesTransactions.id, id));
    });
  }

  async deleteSalesTransactionSecure(id: string, userStationId: string, userRole: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // First verify the transaction belongs to the user's station (unless admin)
      if (userRole !== 'admin') {
        const [transaction] = await tx.select({ stationId: salesTransactions.stationId })
          .from(salesTransactions)
          .where(eq(salesTransactions.id, id));

        if (!transaction) {
          throw new Error('Sales transaction not found');
        }

        if (transaction.stationId !== userStationId) {
          throw new Error('Access denied: Transaction does not belong to your station');
        }
      }

      // Delete related transaction items first
      await tx.delete(salesTransactionItems).where(eq(salesTransactionItems.transactionId, id));

      // Delete the transaction
      const result = await tx.delete(salesTransactions).where(eq(salesTransactions.id, id)).returning({ id: salesTransactions.id });

      if (result.length === 0) {
        throw new Error('Sales transaction not found');
      }
    });
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    const [order] = await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return order || undefined;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Delete related order items first
      await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, id));

      // Delete the purchase order
      await tx.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
    });
  }

  async getPurchaseOrderWithItems(id: string): Promise<(PurchaseOrder & { items: PurchaseOrderItem[], supplier: Supplier, station: Station }) | undefined> {
    const order = await this.db
      .select()
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(stations, eq(purchaseOrders.stationId, stations.id))
      .where(eq(purchaseOrders.id, id))
      .then(results => results[0]);

    if (!order) return undefined;

    // Ensure supplier and station exist - if not, the data is inconsistent
    if (!order.suppliers || !order.stations) {
      throw new Error(`Purchase order ${id} has missing supplier or station data`);
    }

    const items = await this.db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, id));

    return {
      ...order.purchase_orders,
      items,
      supplier: order.suppliers,
      station: order.stations
    };
  }

  async getPurchaseOrderWithItemsSecure(id: string, userStationId: string, userRole: string): Promise<(PurchaseOrder & { items: PurchaseOrderItem[], supplier: Supplier, station: Station }) | undefined> {
    const order = await this.db
      .select()
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(stations, eq(purchaseOrders.stationId, stations.id))
      .where(eq(purchaseOrders.id, id))
      .then(results => results[0]);

    if (!order) return undefined;

    // Ensure supplier and station exist - if not, the data is inconsistent
    if (!order.suppliers || !order.stations) {
      throw new Error(`Purchase order ${id} has missing supplier or station data`);
    }

    // Security check: verify the order belongs to the user's station (admins can access all)
    if (userRole !== 'admin' && order.purchase_orders.stationId !== userStationId) {
      throw new Error('Access denied: Purchase order does not belong to your station');
    }

    const items = await this.db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, id));

    return {
      ...order.purchase_orders,
      items,
      supplier: order.suppliers,
      station: order.stations
    };
  }

  async deletePurchaseOrderSecure(id: string, userStationId: string, userRole: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // First verify the order belongs to the user's station (unless admin)
      if (userRole !== 'admin') {
        const [order] = await tx.select({ stationId: purchaseOrders.stationId })
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, id));

        if (!order) {
          throw new Error('Purchase order not found');
        }

        if (order.stationId !== userStationId) {
          throw new Error('Access denied: Purchase order does not belong to your station');
        }
      }

      // Delete related order items first
      await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, id));

      // Delete the purchase order
      const result = await tx.delete(purchaseOrders).where(eq(purchaseOrders.id, id)).returning({ id: purchaseOrders.id });

      if (result.length === 0) {
        throw new Error('Purchase order not found');
      }
    });
  }

  async getDailyReport(stationId: string, date: Date): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Sales by payment method
    const salesByMethod = await this.db
      .select({
        paymentMethod: salesTransactions.paymentMethod,
        totalAmount: sum(salesTransactions.totalAmount),
        count: sql<number>`count(*)`,
        currencyCode: salesTransactions.currencyCode
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

    // Expenses
    const dailyExpenses = await this.db
      .select({
        category: expenses.category,
        totalAmount: sum(expenses.amount),
        currencyCode: expenses.currencyCode
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.stationId, stationId),
          gte(expenses.expenseDate, startOfDay),
          lte(expenses.expenseDate, endOfDay)
        )
      )
      .groupBy(expenses.category, expenses.currencyCode);

    return {
      date,
      salesByMethod,
      expenses: dailyExpenses
    };
  }

  async getAgingReport(stationId: string, type: 'receivable' | 'payable'): Promise<any> {
    try {
      if (type === 'receivable') {
        // Get all outstanding receivables
        const receivables = await this.db
          .select({
            id: salesTransactions.id,
            invoiceNumber: salesTransactions.invoiceNumber,
            customerName: customers.name,
            transactionDate: salesTransactions.transactionDate,
            dueDate: salesTransactions.dueDate,
            totalAmount: salesTransactions.totalAmount,
            paidAmount: salesTransactions.paidAmount,
            outstandingAmount: salesTransactions.outstandingAmount,
            currencyCode: salesTransactions.currencyCode,
            daysOverdue: sql<number>`CASE
              WHEN ${salesTransactions.dueDate} IS NULL THEN 0
              WHEN ${salesTransactions.dueDate} < CURRENT_DATE THEN EXTRACT(day FROM CURRENT_DATE - ${salesTransactions.dueDate})::integer
              ELSE 0
            END`
          })
          .from(salesTransactions)
          .leftJoin(customers, eq(salesTransactions.customerId, customers.id))
          .where(
            and(
              eq(salesTransactions.stationId, stationId),
              sql`${salesTransactions.outstandingAmount} > 0`
            )
          )
          .orderBy(salesTransactions.dueDate);

        // Group into age buckets
        const buckets = {
          current: receivables.filter(r => r.daysOverdue <= 0),
          days30: receivables.filter(r => r.daysOverdue > 0 && r.daysOverdue <= 30),
          days60: receivables.filter(r => r.daysOverdue > 30 && r.daysOverdue <= 60),
          days90: receivables.filter(r => r.daysOverdue > 60 && r.daysOverdue <= 90),
          over90: receivables.filter(r => r.daysOverdue > 90)
        };

        // Calculate totals for each bucket
        const totals = {
          current: buckets.current.reduce((sum, r) => sum + Number(r.outstandingAmount), 0),
          days30: buckets.days30.reduce((sum, r) => sum + Number(r.outstandingAmount), 0),
          days60: buckets.days60.reduce((sum, r) => sum + Number(r.outstandingAmount), 0),
          days90: buckets.days90.reduce((sum, r) => sum + Number(r.outstandingAmount), 0),
          over90: buckets.over90.reduce((sum, r) => sum + Number(r.outstandingAmount), 0)
        };

        return {
          type: 'receivable',
          buckets,
          totals,
          grandTotal: Object.values(totals).reduce((sum, total) => sum + total, 0),
          details: receivables
        };

      } else {
        // Get all outstanding payables
        const payables = await this.db
          .select({
            id: purchaseOrders.id,
            orderNumber: purchaseOrders.orderNumber,
            supplierName: suppliers.name,
            orderDate: purchaseOrders.orderDate,
            dueDate: purchaseOrders.dueDate,
            totalAmount: purchaseOrders.totalAmount,
            paidAmount: purchaseOrders.paidAmount,
            outstandingAmount: sql<string>`${purchaseOrders.totalAmount} - ${purchaseOrders.paidAmount}`,
            currencyCode: purchaseOrders.currencyCode,
            daysOverdue: sql<number>`CASE
              WHEN ${purchaseOrders.dueDate} IS NULL THEN 0
              WHEN ${purchaseOrders.dueDate} < CURRENT_DATE THEN EXTRACT(day FROM CURRENT_DATE - ${purchaseOrders.dueDate})::integer
              ELSE 0
            END`
          })
          .from(purchaseOrders)
          .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
          .where(
            and(
              eq(purchaseOrders.stationId, stationId),
              sql`${purchaseOrders.totalAmount} - ${purchaseOrders.paidAmount} > 0`
            )
          )
          .orderBy(purchaseOrders.dueDate);

        // Group into age buckets
        const buckets = {
          current: payables.filter(p => p.daysOverdue <= 0),
          days30: payables.filter(p => p.daysOverdue > 0 && p.daysOverdue <= 30),
          days60: payables.filter(p => p.daysOverdue > 30 && p.daysOverdue <= 60),
          days90: payables.filter(p => p.daysOverdue > 60 && p.daysOverdue <= 90),
          over90: payables.filter(p => p.daysOverdue > 90)
        };

        // Calculate totals for each bucket
        const totals = {
          current: buckets.current.reduce((sum, p) => sum + Number(p.outstandingAmount), 0),
          days30: buckets.days30.reduce((sum, p) => sum + Number(p.outstandingAmount), 0),
          days60: buckets.days60.reduce((sum, p) => sum + Number(p.outstandingAmount), 0),
          days90: buckets.days90.reduce((sum, p) => sum + Number(p.outstandingAmount), 0),
          over90: buckets.over90.reduce((sum, p) => sum + Number(p.outstandingAmount), 0)
        };

        return {
          type: 'payable',
          buckets,
          totals,
          grandTotal: Object.values(totals).reduce((sum, total) => sum + total, 0),
          details: payables
        };
      }
    } catch (error) {
      throw new Error(`Failed to generate aging report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSettings(stationId: string): Promise<Settings | undefined> {
    const [setting] = await this.db.select().from(settings).where(eq(settings.stationId, stationId));
    return setting || undefined;
  }

  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    const [setting] = await this.db.insert(settings).values(insertSettings).returning();
    return setting;
  }

  async updateSettings(stationId: string, settingsData: Partial<InsertSettings>): Promise<Settings> {
    const [setting] = await this.db.update(settings)
      .set({ ...settingsData, updatedAt: new Date() })
      .where(eq(settings.stationId, stationId))
      .returning();
    if (!setting) throw new Error("Settings not found");
    return setting;
  }

  async getPumpsByStation(stationId: string): Promise<(Pump & { product?: Product })[]> {
    const result = await this.db
      .select({
        id: pumps.id,
        stationId: pumps.stationId,
        name: pumps.name,
        pumpNumber: pumps.pumpNumber,
        productId: pumps.productId,
        isActive: pumps.isActive,
        createdAt: pumps.createdAt,
        product: {
          id: products.id,
          name: products.name,
          category: products.category,
          unit: products.unit,
          currentPrice: products.currentPrice,
          density: products.density,
          hsnCode: products.hsnCode,
          taxRate: products.taxRate,
          isActive: products.isActive,
          createdAt: products.createdAt
        }
      })
      .from(pumps)
      .leftJoin(products, eq(pumps.productId, products.id))
      .where(eq(pumps.stationId, stationId));

    return result as (Pump & { product?: Product })[];
  }

  async createPump(data: any): Promise<Pump> {
    const [pump] = await this.db.insert(pumps).values(data).returning();
    return pump;
  }

  async updatePump(id: string, data: any): Promise<Pump> {
    const [pump] = await this.db.update(pumps)
      .set(data)
      .where(eq(pumps.id, id))
      .returning();
    return pump;
  }

  async deletePump(id: string): Promise<void> {
    await this.db.delete(pumps).where(eq(pumps.id, id));
  }

  async getPumpReadingsByStation(stationId: string): Promise<(PumpReading & { pump?: Pump & { product?: Product }; product?: Product })[]> {
    const result = await this.db
      .select({
        id: pumpReadings.id,
        pumpId: pumpReadings.pumpId,
        stationId: pumpReadings.stationId,
        userId: pumpReadings.userId,
        productId: pumpReadings.productId,
        readingDate: pumpReadings.readingDate,
        openingReading: pumpReadings.openingReading,
        closingReading: pumpReadings.closingReading,
        totalSale: pumpReadings.totalSale,
        shiftNumber: pumpReadings.shiftNumber,
        operatorName: pumpReadings.operatorName,
        createdAt: pumpReadings.createdAt,
        pump: {
          id: pumps.id,
          name: pumps.name,
          pumpNumber: pumps.pumpNumber,
          productId: pumps.productId,
          isActive: pumps.isActive,
          stationId: pumps.stationId,
          createdAt: pumps.createdAt
        },
        product: {
          id: products.id,
          name: products.name,
          category: products.category,
          unit: products.unit,
          currentPrice: products.currentPrice,
          density: products.density,
          hsnCode: products.hsnCode,
          taxRate: products.taxRate,
          isActive: products.isActive,
          createdAt: products.createdAt
        }
      })
      .from(pumpReadings)
      .leftJoin(pumps, eq(pumpReadings.pumpId, pumps.id))
      .leftJoin(products, eq(pumpReadings.productId, products.id))
      .where(eq(pumpReadings.stationId, stationId))
      .orderBy(desc(pumpReadings.readingDate));

    return result as (PumpReading & { pump?: Pump & { product?: Product }; product?: Product })[];
  }

  async createPumpReading(data: any): Promise<PumpReading> {
    const [reading] = await this.db.insert(pumpReadings).values(data).returning();
    return reading;
  }

  // Ledger System Implementations
  async getAccountsByStation(stationId: string): Promise<(Account & { parentAccount?: Account })[]> {
    const result = await this.db
      .select({
        id: accounts.id,
        stationId: accounts.stationId,
        code: accounts.code,
        name: accounts.name,
        type: accounts.type,
        normalBalance: accounts.normalBalance,
        parentAccountId: accounts.parentAccountId,
        currencyCode: accounts.currencyCode,
        isActive: accounts.isActive,
        isSystem: accounts.isSystem,
        createdAt: accounts.createdAt,
        parentAccount: {
          id: sql`parent_account.id`,
          name: sql`parent_account.name`,
          code: sql`parent_account.code`
        }
      })
      .from(accounts)
      .leftJoin(sql`accounts AS parent_account`, sql`accounts.parent_account_id = parent_account.id`)
      .where(and(eq(accounts.stationId, stationId), eq(accounts.isActive, true)))
      .orderBy(accounts.code);

    return result as (Account & { parentAccount?: Account })[];
  }

  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await this.db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [createdAccount] = await this.db.insert(accounts).values(account).returning();
    return createdAccount;
  }

  async updateAccount(id: string, account: Partial<InsertAccount>): Promise<Account> {
    const [updatedAccount] = await this.db
      .update(accounts)
      .set(account)
      .where(eq(accounts.id, id))
      .returning();
    if (!updatedAccount) throw new Error("Account not found");
    return updatedAccount;
  }

  async deleteAccount(id: string): Promise<void> {
    await this.db.delete(accounts).where(eq(accounts.id, id));
  }

  async getJournalEntriesByStation(stationId: string, limit = 50): Promise<(JournalEntry & { lines: JournalLine[] })[]> {
    // This is a simplified implementation - in production you'd use proper joins
    const entries = await this.db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.stationId, stationId))
      .orderBy(desc(journalEntries.entryDate))
      .limit(limit);

    const entriesWithLines = await Promise.all(
      entries.map(async (entry) => {
        const lines = await this.db
          .select()
          .from(journalLines)
          .where(eq(journalLines.entryId, entry.id));
        return { ...entry, lines };
      })
    );

    return entriesWithLines;
  }

  async getJournalEntry(id: string): Promise<(JournalEntry & { lines: JournalLine[] }) | undefined> {
    const [entry] = await this.db.select().from(journalEntries).where(eq(journalEntries.id, id));
    if (!entry) return undefined;

    const lines = await this.db
      .select()
      .from(journalLines)
      .where(eq(journalLines.entryId, id));

    return { ...entry, lines };
  }

  async createJournalEntry(entry: InsertJournalEntry, lines: InsertJournalLine[]): Promise<JournalEntry> {
    // Validate lines array
    if (!lines || lines.length === 0) {
      throw new Error("Journal entry must have at least one line");
    }

    // Calculate totals and validate double-entry principles
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);

      // Validate that each line has either debit OR credit, not both or neither
      if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
        throw new Error("Each journal line must have either a debit or credit amount, but not both");
      }

      // Validate non-negative amounts
      if (debit < 0 || credit < 0) {
        throw new Error("Debit and credit amounts must be non-negative");
      }

      totalDebit += debit;
      totalCredit += credit;

      // Validate account exists and is active (basic validation)
      if (!line.accountId) {
        throw new Error("Each journal line must have an account");
      }
    }

    // Critical double-entry validation: debits must equal credits
    if (Math.abs(totalDebit - totalCredit) > 0.01) { // Allow for minor rounding differences
      throw new Error(`Journal entry is not balanced. Total debits (${totalDebit}) must equal total credits (${totalCredit})`);
    }

    // Use database transaction to ensure atomicity
    return await this.db.transaction(async (tx) => {
      // Verify all accounts exist, are active, and belong to the same station
      const accountIds = lines.map(line => line.accountId).filter(Boolean);
      const accountsCheck = await tx
        .select({ id: accounts.id, stationId: accounts.stationId, isActive: accounts.isActive })
        .from(accounts)
        .where(sql`${accounts.id} IN (${accountIds.map(id => `'${id}'`).join(',')})`);

      if (accountsCheck.length !== accountIds.length) {
        throw new Error("One or more accounts do not exist");
      }

      // Verify all accounts are active
      const inactiveAccounts = accountsCheck.filter(acc => !acc.isActive);
      if (inactiveAccounts.length > 0) {
        throw new Error("Cannot create journal entry with inactive accounts");
      }

      // Verify all accounts belong to the same station
      const stationIds = [...new Set(accountsCheck.map(acc => acc.stationId))];
      if (stationIds.length > 1 || stationIds[0] !== entry.stationId) {
        throw new Error("All accounts must belong to the same station as the journal entry");
      }

      // Insert journal entry
      const [createdEntry] = await tx.insert(journalEntries).values({
        ...entry,
        totalDebit: totalDebit.toString(),
        totalCredit: totalCredit.toString(),
      }).returning();

      // Insert journal lines
      await tx.insert(journalLines).values(
        lines.map(line => ({ ...line, entryId: createdEntry.id }))
      );

      return createdEntry;
    });
  }

  async postJournalEntry(id: string): Promise<void> {
    await this.db
      .update(journalEntries)
      .set({ isPosted: true, postedAt: new Date() })
      .where(eq(journalEntries.id, id));
  }

  async getAccountLedger(accountId: string, fromDate?: Date, toDate?: Date): Promise<any[]> {
    // Simplified ledger query - in production you'd want more sophisticated balance calculations
    let query = this.db
      .select({
        date: journalEntries.entryDate,
        entryNumber: journalEntries.entryNumber,
        description: journalEntries.description,
        debit: journalLines.debit,
        credit: journalLines.credit,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
      .where(and(
        eq(journalLines.accountId, accountId),
        eq(journalEntries.isPosted, true)
      ))
      .orderBy(journalEntries.entryDate);

    if (fromDate) {
      query = query.where(and(
        eq(journalLines.accountId, accountId),
        eq(journalEntries.isPosted, true),
        gte(journalEntries.entryDate, fromDate)
      ));
    }

    if (toDate) {
      query = query.where(and(
        eq(journalLines.accountId, accountId),
        eq(journalEntries.isPosted, true),
        lte(journalEntries.entryDate, toDate)
      ));
    }

    return await query;
  }

  async getTrialBalance(stationId: string, asOfDate?: Date): Promise<any[]> {
    // Simplified trial balance - in production you'd want proper balance calculations
    return await this.db
      .select({
        accountId: accounts.id,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        totalDebit: sum(journalLines.debit),
        totalCredit: sum(journalLines.credit),
      })
      .from(accounts)
      .leftJoin(journalLines, eq(accounts.id, journalLines.accountId))
      .leftJoin(journalEntries, and(
        eq(journalLines.entryId, journalEntries.id),
        eq(journalEntries.isPosted, true),
        asOfDate ? lte(journalEntries.entryDate, asOfDate) : undefined
      ))
      .where(eq(accounts.stationId, stationId))
      .groupBy(accounts.id, accounts.code, accounts.name, accounts.type);
  }
}

export const storage = new DatabaseStorage();