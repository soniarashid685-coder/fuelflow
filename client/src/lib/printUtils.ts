export interface PrintTemplate {
  title: string;
  content: string;
  filename: string;
}

// Global print function that prints in current tab
export const globalPrintDocument = (template: PrintTemplate | string, filename?: string) => {
  // Handle both template object and direct HTML string
  let content: string;
  let title: string;
  
  if (typeof template === 'string') {
    content = template;
    title = filename || 'Document';
  } else {
    content = template.content;
    title = template.title;
  }
  try {
    // Create a clean print container
    const printContainer = document.createElement('div');
    printContainer.id = 'global-print-container';
    printContainer.innerHTML = `
      <style>
        @page { 
          margin: 0.5in; 
          size: A4; 
        }
        @media print {
          body * { 
            visibility: hidden; 
          }
          #global-print-container, #global-print-container * { 
            visibility: visible; 
          }
          #global-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #000;
            padding: 20px;
            box-sizing: border-box;
          }
        }
        @media screen {
          #global-print-container {
            display: none;
          }
        }
      </style>
      ${content}
    `;
    
    // Remove any existing print container
    const existing = document.getElementById('global-print-container');
    if (existing) {
      document.body.removeChild(existing);
    }
    
    document.body.appendChild(printContainer);
    
    // Print and cleanup
    setTimeout(() => {
      window.print();
      
      setTimeout(() => {
        if (document.body.contains(printContainer)) {
          document.body.removeChild(printContainer);
        }
      }, 1000);
    }, 200);
    
  } catch (error) {
    console.error('Print failed:', error);
    alert('Print failed. Please try again.');
  }
};

export const generatePrintTemplate = (data: any, type: 'invoice' | 'receipt' | 'statement' | 'expense' | 'purchaseOrder' | 'pumpReading'): PrintTemplate => {
  const today = new Date().toLocaleDateString();

  switch (type) {
    case 'invoice':
      return {
        title: `Sales Invoice ${data.invoiceNumber || data.orderNumber}`,
        filename: `invoice-${data.invoiceNumber || data.orderNumber}`,
        content: `
          <div style="max-width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
              <h1 style="color: #2563eb; font-size: 28px; margin: 0;">${data.stationName || 'FuelFlow Station'}</h1>
              <h2>${data.invoiceNumber ? 'Sales Invoice' : 'Purchase Order'}</h2>
              <div style="text-align: right; margin-top: 10px;">
                <p><strong>${data.invoiceNumber ? 'Invoice' : 'Order'} #:</strong> ${data.invoiceNumber || data.orderNumber}</p>
                <p><strong>Date:</strong> ${new Date(data.createdAt || data.orderDate || Date.now()).toLocaleDateString()}</p>
                <p><strong>${data.customer ? 'Customer' : 'Supplier'}:</strong> ${data.customer?.name || data.supplier?.name || 'Walk-in Customer'}</p>
              </div>
            </div>

            <div style="margin-bottom: 30px;">
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Product</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Quantity</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Unit Price</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.items?.map(item => `
                    <tr>
                      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.product?.name || 'Product'}</td>
                      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${parseFloat(item.quantity || '0').toFixed(3)} ${item.product?.unit || 'L'}</td>
                      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.unitPrice || '0.00'}</td>
                      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.totalPrice || '0.00'}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="4" style="text-align: center; padding: 12px;">No items</td></tr>'}
                </tbody>
              </table>
            </div>

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Subtotal:</span>
                <span>${data.subtotal || '0.00'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Tax:</span>
                <span>${data.taxAmount || '0.00'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 1px solid #ddd; padding-top: 10px;">
                <span>Total Amount:</span>
                <span>${data.totalAmount || '0.00'}</span>
              </div>
              ${parseFloat(data.outstandingAmount || '0') > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #dc2626; margin-top: 10px;">
                <span>Outstanding Amount:</span>
                <span>${data.outstandingAmount}</span>
              </div>` : ''}
            </div>

            <div style="text-align: center; margin-top: 40px; color: #666; font-size: 12px;">
              <p>Thank you for your business!</p>
              <p>Generated on ${today}</p>
            </div>
          </div>
        `
      };

    case 'expense':
      return {
        title: `Expense Receipt ${data.receiptNumber || data.id}`,
        filename: `expense-${data.receiptNumber || data.id}`,
        content: `
          <div style="max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
              <h1 style="color: #2563eb; margin: 0;">${data.stationName || 'FuelFlow Station'}</h1>
              <h2>Expense Receipt</h2>
              <p>Receipt #: ${data.receiptNumber || data.id}</p>
            </div>

            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3>Expense Details</h3>
              <p><strong>Description:</strong> ${data.description || 'N/A'}</p>
              <p><strong>Amount:</strong> ${data.amount || '0.00'}</p>
              <p><strong>Category:</strong> ${data.category || 'N/A'}</p>
              <p><strong>Payment Method:</strong> ${data.paymentMethod || 'N/A'}</p>
              <p><strong>Date:</strong> ${new Date(data.expenseDate || Date.now()).toLocaleDateString()}</p>
              ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
            </div>

            <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
              <p>This is a computer-generated receipt from FuelFlow Management System</p>
              <p>Generated on ${today}</p>
            </div>
          </div>
        `
      };

    case 'purchaseOrder':
      return {
        title: `Purchase Order ${data.orderNumber}`,
        filename: `purchase-order-${data.orderNumber}`,
        content: `
          <div style="max-width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
              <h1 style="color: #2563eb; font-size: 28px; margin: 0;">${data.station?.name || data.stationName || 'FuelFlow Station'}</h1>
              <h2>Purchase Order</h2>
              <div style="text-align: right; margin-top: 10px;">
                <p><strong>Order #:</strong> ${data.orderNumber}</p>
                <p><strong>Date:</strong> ${new Date(data.orderDate || data.createdAt || Date.now()).toLocaleDateString()}</p>
                <p><strong>Supplier:</strong> ${data.supplier?.name || 'Unknown Supplier'}</p>
                <p><strong>Status:</strong> <span style="background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px;">${data.status || 'Pending'}</span></p>
              </div>
            </div>

            <div style="margin-bottom: 30px;">
              <h3>Supplier Details</h3>
              <p><strong>Name:</strong> ${data.supplier?.name || 'N/A'}</p>
              ${data.supplier?.contactPerson ? `<p><strong>Contact Person:</strong> ${data.supplier.contactPerson}</p>` : ''}
              ${data.supplier?.contactPhone ? `<p><strong>Phone:</strong> ${data.supplier.contactPhone}</p>` : ''}
              ${data.supplier?.contactEmail ? `<p><strong>Email:</strong> ${data.supplier.contactEmail}</p>` : ''}
              ${data.supplier?.address ? `<p><strong>Address:</strong> ${data.supplier.address}</p>` : ''}
            </div>

            <div style="margin-bottom: 30px;">
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Product</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Quantity</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Unit Price</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.items?.map(item => `
                    <tr>
                      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.product?.name || 'Product'}</td>
                      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${parseFloat(item.quantity || '0').toFixed(3)} ${item.product?.unit || 'L'}</td>
                      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.unitPrice || '0.00'}</td>
                      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.totalPrice || '0.00'}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="4" style="text-align: center; padding: 12px;">No items</td></tr>'}
                </tbody>
              </table>
            </div>

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Subtotal:</span>
                <span>${data.subtotal || '0.00'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Tax:</span>
                <span>${data.taxAmount || '0.00'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 1px solid #ddd; padding-top: 10px;">
                <span>Total Amount:</span>
                <span>${data.totalAmount || '0.00'}</span>
              </div>
            </div>

            ${data.notes ? `
            <div style="margin: 30px 0;">
              <h3>Notes</h3>
              <p>${data.notes}</p>
            </div>` : ''}

            <div style="text-align: center; margin-top: 40px; color: #666; font-size: 12px;">
              <p>Purchase Order generated from FuelFlow Management System</p>
              <p>Generated on ${today}</p>
            </div>
          </div>
        `
      };

    case 'pumpReading':
      return {
        title: `Pump Reading - ${data.pump?.name || 'Pump'} - ${data.shiftNumber}`,
        filename: `pump-reading-${data.pump?.pumpNumber || data.id}`,
        content: `
          <div style="max-width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
              <h1 style="color: #2563eb; font-size: 28px; margin: 0;">${data.station?.name || 'FuelFlow Station'}</h1>
              <h2>Pump Reading Report</h2>
              <div style="text-align: right; margin-top: 10px;">
                <p><strong>Reading Date:</strong> ${new Date(data.readingDate || data.createdAt || Date.now()).toLocaleDateString()}</p>
                <p><strong>Shift Number:</strong> ${data.shiftNumber}</p>
                <p><strong>Operator:</strong> ${data.operatorName}</p>
              </div>
            </div>

            <div style="margin-bottom: 30px;">
              <h3>Pump Information</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div style="padding: 10px; background: #f9fafb; border-radius: 5px;">
                  <div style="font-weight: bold; color: #374151;">Pump Name</div>
                  <div style="color: #6b7280; margin-top: 5px;">${data.pump?.name || 'N/A'}</div>
                </div>
                <div style="padding: 10px; background: #f9fafb; border-radius: 5px;">
                  <div style="font-weight: bold; color: #374151;">Pump Number</div>
                  <div style="color: #6b7280; margin-top: 5px;">${data.pump?.pumpNumber || 'N/A'}</div>
                </div>
                <div style="padding: 10px; background: #f9fafb; border-radius: 5px;">
                  <div style="font-weight: bold; color: #374151;">Product</div>
                  <div style="color: #6b7280; margin-top: 5px;">${data.product?.name || 'N/A'}</div>
                </div>
                <div style="padding: 10px; background: #f9fafb; border-radius: 5px;">
                  <div style="font-weight: bold; color: #374151;">Product Category</div>
                  <div style="color: #6b7280; margin-top: 5px;">${data.product?.category || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div style="margin-bottom: 30px;">
              <h3>Reading Details</h3>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Measurement</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Value</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Opening Reading</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${parseFloat(data.openingReading || '0').toFixed(3)}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Litres</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Closing Reading</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${parseFloat(data.closingReading || '0').toFixed(3)}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Litres</td>
                  </tr>
                  <tr style="background: #f0f9ff;">
                    <td style="padding: 12px; font-weight: bold;">Total Sale</td>
                    <td style="padding: 12px; font-weight: bold;">${parseFloat(data.totalSale || '0').toFixed(3)}</td>
                    <td style="padding: 12px; font-weight: bold;">Litres</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #2563eb;">
              <h3>Summary</h3>
              <p><strong>Shift:</strong> ${data.shiftNumber}</p>
              <p><strong>Operator:</strong> ${data.operatorName}</p>
              <p><strong>Total Fuel Dispensed:</strong> ${parseFloat(data.totalSale || '0').toFixed(3)} Litres</p>
              <p><strong>Reading Period:</strong> ${new Date(data.readingDate || data.createdAt || Date.now()).toLocaleDateString()}</p>
            </div>

            <div style="text-align: center; margin-top: 40px; color: #666; font-size: 12px;">
              <p>Pump Reading Report generated from FuelFlow Management System</p>
              <p>Generated on ${today}</p>
              <p>This is an official record of fuel dispensing activities</p>
            </div>
          </div>
        `
      };

    default:
      return {
        title: 'Document',
        filename: 'document',
        content: '<div style="text-align: center; padding: 50px;"><h1>Document</h1><p>Content not available</p></div>'
      };
  }
};

export const printDocument = (template: PrintTemplate) => {
  globalPrintDocument(template);
};

export const downloadAsPDF = (template: PrintTemplate) => {
  const blob = new Blob([template.content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${template.filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadAsPNG = async (template: PrintTemplate) => {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = template.content;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.style.background = 'white';
    document.body.appendChild(tempDiv);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 1200;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.fillText(template.title, 50, 50);

    document.body.removeChild(tempDiv);

    const link = document.createElement('a');
    link.download = `${template.filename}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('PNG download failed:', error);
    alert('PNG download not available. Please use PDF option.');
  }
};