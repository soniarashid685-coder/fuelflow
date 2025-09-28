import { storage } from "./storage";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, stations, products as productsList, customers, schema } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import { generateId } from "./utils";

export async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create default admin user
    const adminUser = await db.insert(users).values({
      id: generateId(),
      username: "admin",
      password: await bcrypt.hash("admin123", 10),
      fullName: "System Administrator",
      role: "admin",
      isActive: true,
    }).returning();

    // Create sample cashier
    const cashierUser = await db.insert(users).values({
      id: generateId(),
      username: "cashier1",
      password: await bcrypt.hash("cashier123", 10),
      fullName: "John Cashier",
      role: "cashier",
      stationId: null, // Will be updated after station creation
      isActive: true,
    }).returning();

    console.log("👤 Created users");

    // Create sample station
    const station = await db.insert(stations).values({
      id: generateId(),
      name: "FuelFlow Demo Station",
      address: "123 Main Street, Demo City",
      contactPhone: "+1-555-0123",
      contactEmail: "demo@fuelflow.com",
      licenseNumber: "FL-2024-001",
      gstNumber: "GST123456789",
      isActive: true,
    }).returning();

    // Update cashier and admin with station ID
    await db.update(users).set({ stationId: station[0].id }).where(eq(users.id, cashierUser[0].id));
    await db.update(users).set({ stationId: station[0].id }).where(eq(users.id, adminUser[0].id));

    console.log("🏪 Created sample station");

    // Create sample products
    const products = await db.insert(schema.products).values([
      {
        id: generateId(),
        name: "Petrol",
        category: "fuel",
        unit: "litre",
        currentPrice: "285.50",
        density: "0.750",
        hsnCode: "27101290",
        isActive: true,
      },
      {
        id: generateId(),
        name: "Diesel",
        category: "fuel",
        unit: "litre",
        currentPrice: "275.25",
        density: "0.832",
        hsnCode: "27101981",
        isActive: true,
      },
      {
        id: generateId(),
        name: "Engine Oil 20W-50",
        category: "lubricant",
        unit: "bottle",
        currentPrice: "850.00",
        hsnCode: "27101990",
        isActive: true,
      },
      {
        id: generateId(),
        name: "Brake Fluid",
        category: "other",
        unit: "bottle",
        currentPrice: "450.00",
        hsnCode: "38190010",
        isActive: true,
      }
    ]).returning();

    // Create sample customers
    const customers = await db.insert(schema.customers).values([
      {
        id: generateId(),
        name: "Walk-in Customer",
        type: "walk-in",
        contactPhone: "",
        contactEmail: "",
        address: "",
        creditLimit: "0",
        outstandingAmount: "0",
        gstNumber: "",
      },
      {
        id: generateId(),
        name: "ABC Transport Ltd.",
        type: "credit",
        contactPhone: "+1-555-1001",
        contactEmail: "accounts@abctransport.com",
        address: "456 Business Park, Demo City",
        creditLimit: "50000",
        outstandingAmount: "15000",
        gstNumber: "GST987654321",
      },
      {
        id: generateId(),
        name: "City Logistics",
        type: "fleet",
        contactPhone: "+1-555-1002",
        contactEmail: "billing@citylogistics.com",
        address: "789 Industrial Area, Demo City",
        creditLimit: "75000",
        outstandingAmount: "25000",
        gstNumber: "GST456789123",
      }
    ]).returning();

    // Create sample suppliers
    const suppliers = await db.insert(schema.suppliers).values([
      {
        id: generateId(),
        name: "Petro Supply Corp",
        contactPerson: "David Manager",
        contactPhone: "+1-555-2001",
        contactEmail: "orders@petrosupply.com",
        address: "101 Industrial Complex, Supply City",
        paymentTerms: "Net 30",
        outstandingAmount: "125000",
        gstNumber: "GST111222333",
        isActive: true,
      },
      {
        id: generateId(),
        name: "Lubricants Direct",
        contactPerson: "Sarah Sales",
        contactPhone: "+1-555-2002",
        contactEmail: "sales@lubricantsdirect.com",
        address: "202 Commerce Street, Supply City",
        paymentTerms: "Net 15",
        outstandingAmount: "45000",
        gstNumber: "GST444555666",
        isActive: true,
      }
    ]).returning();

    // Create sample accounts for expense management
    const sampleAccounts = await db.insert(schema.accounts).values([
      {
        id: generateId(),
        stationId: station[0].id,
        code: "1001",
        name: "Cash in Hand",
        type: "asset",
        normalBalance: "debit",
        isActive: true,
        isSystem: true,
      },
      {
        id: generateId(),
        stationId: station[0].id,
        code: "5001",
        name: "Electricity Expense",
        type: "expense",
        normalBalance: "debit",
        isActive: true,
        isSystem: false,
      },
      {
        id: generateId(),
        stationId: station[0].id,
        code: "5002",
        name: "Maintenance Expense",
        type: "expense",
        normalBalance: "debit",
        isActive: true,
        isSystem: false,
      },
      {
        id: generateId(),
        stationId: station[0].id,
        code: "5003",
        name: "Office Supplies",
        type: "expense",
        normalBalance: "debit",
        isActive: true,
        isSystem: false,
      }
    ]).returning();

    // Create sample tanks
    const tanks = await db.insert(schema.tanks).values([
      {
        id: generateId(),
        stationId: station[0].id,
        productId: productsList[0].id, // Petrol
        name: "Tank 1 - Petrol",
        capacity: "10000",
        currentStock: "7500",
        minimumLevel: "1000",
        isActive: true,
      },
      {
        id: generateId(),
        stationId: station[0].id,
        productId: productsList[1].id, // Diesel
        name: "Tank 2 - Diesel",
        capacity: "15000",
        currentStock: "12000",
        minimumLevel: "1500",
        isActive: true,
      }
    ]).returning();

    // Create sample pumps
    const pumps = await db.insert(schema.pumps).values([
      {
        id: generateId(),
        stationId: station[0].id,
        pumpNumber: "P001",
        name: "Pump 1",
        productId: productsList[0].id, // Petrol
        isActive: true,
      },
      {
        id: generateId(),
        stationId: station[0].id,
        pumpNumber: "P002",
        name: "Pump 2",
        productId: productsList[1].id, // Diesel
        isActive: true,
      }
    ]).returning();

    // Create sample sales transactions
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const sampleSales = await db.insert(schema.salesTransactions).values([
      {
        id: generateId(),
        invoiceNumber: "SAL001001",
        stationId: station[0].id,
        customerId: customers[0].id, // Walk-in
        userId: adminUser[0].id,
        transactionDate: yesterday,
        paymentMethod: "cash",
        currencyCode: "PKR",
        subtotal: "2855.00",
        taxAmount: "0.00",
        totalAmount: "2855.00",
        paidAmount: "2855.00",
        outstandingAmount: "0.00",
      },
      {
        id: generateId(),
        invoiceNumber: "SAL001002",
        stationId: station[0].id,
        customerId: customers[1].id, // ABC Transport
        userId: adminUser[0].id,
        transactionDate: now,
        paymentMethod: "credit",
        currencyCode: "PKR",
        subtotal: "15000.00",
        taxAmount: "0.00",
        totalAmount: "15000.00",
        paidAmount: "0.00",
        outstandingAmount: "15000.00",
      }
    ]).returning();

    // Create sample expenses
    const sampleExpenses = await db.insert(schema.expenses).values([
      {
        id: generateId(),
        stationId: station[0].id,
        userId: adminUser[0].id,
        accountId: sampleAccounts[1].id, // Electricity
        description: "Monthly electricity bill",
        amount: "15000.00",
        category: "utilities",
        paymentMethod: "card",
        expenseDate: yesterday,
        receiptNumber: "ELC-001",
        vendorName: "Power Company",
      },
      {
        id: generateId(),
        stationId: station[0].id,
        userId: adminUser[0].id,
        accountId: sampleAccounts[2].id, // Maintenance
        description: "Pump maintenance service",
        amount: "8500.00",
        category: "maintenance",
        paymentMethod: "cash",
        expenseDate: now,
        receiptNumber: "MNT-001",
        vendorName: "Pump Services Ltd",
      }
    ]).returning();

    // Create sample payments
    await db.insert(schema.payments).values([
      {
        id: generateId(),
        stationId: station[0].id,
        userId: adminUser[0].id,
        customerId: customers[1].id,
        type: "receivable",
        amount: "10000.00",
        paymentMethod: "card",
        paymentDate: now,
        currencyCode: "PKR",
        referenceNumber: "PAY-001",
        notes: "Partial payment from ABC Transport",
      },
      {
        id: generateId(),
        stationId: station[0].id,
        userId: adminUser[0].id,
        supplierId: suppliers[0].id,
        type: "payable",
        amount: "75000.00",
        paymentMethod: "card",
        paymentDate: yesterday,
        currencyCode: "PKR",
        referenceNumber: "PAY-002",
        notes: "Payment to Petro Supply Corp",
      }
    ]).returning();

    // Create sample purchase orders
    await db.insert(schema.purchaseOrders).values([
      {
        id: generateId(),
        orderNumber: "PUR001001",
        stationId: station[0].id,
        supplierId: suppliers[0].id,
        userId: adminUser[0].id,
        orderDate: yesterday,
        expectedDeliveryDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: "pending",
        currencyCode: "PKR",
        subtotal: "150000.00",
        taxAmount: "0.00",
        totalAmount: "150000.00",
        notes: "Monthly fuel supply order",
      }
    ]).returning();

    console.log("⛽ Created comprehensive sample data");
    console.log("✅ Database seeding completed successfully!");
    console.log("📋 Sample users created:");
    console.log("   - Admin: username 'admin', password 'admin123'");
    console.log("   - Cashier: username 'cashier1', password 'cashier123'");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// The following functions are no longer needed as the seeding logic is consolidated in the new 'seed' function.
// async function seedInitialData() { ... }
// async function seedSampleData() { ... }
// function getExpenseDescription(category: string): string { ... }