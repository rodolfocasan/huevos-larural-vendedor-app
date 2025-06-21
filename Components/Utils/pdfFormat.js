// Components/Utils/pdfFormat.js
import React from 'react'

import { formatDate } from './Constants';





export const customFormatTime = (date) => {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // la hora '0' debe ser '12'
    const formattedHours = hours.toString().padStart(2, '0'); // Añadir el cero para números de un solo dígito

    return `${formattedHours}:${minutes}:${seconds} ${ampm}`;
};

export const generatePDFContent = (sale, sortedTransactions) => {
    const creationDate = formatDate(sale.createdAt);
    const creationTime = customFormatTime(sale.createdAt);

    let htmlContent = `
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {
                size: A4;
                margin: 15mm 20mm 15mm 20mm;
            }
            
            * {
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', 'Helvetica', sans-serif;
                margin: 0;
                padding: 0;
                color: #2c3e50;
                line-height: 1.4;
                font-size: 12px;
                background-color: #ffffff;
            }
            
            .document-container {
                width: 100%;
                max-width: 210mm;
                margin: 0 auto;
                background: white;
            }
            
            /* Header */
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
                padding: 15px 0;
                border-bottom: 3px solid #3498db;
                page-break-inside: avoid;
            }
            
            .company-info {
                flex: 1;
            }
            
            .company-name {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 5px;
            }
            
            .company-subtitle {
                font-size: 12px;
                color: #7f8c8d;
                font-style: italic;
            }
            
            .document-info {
                text-align: right;
                flex: 1;
            }
            
            .document-title {
                font-size: 16px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .document-meta {
                font-size: 11px;
                color: #34495e;
                line-height: 1.3;
            }
            
            .sale-name {
                font-size: 14px;
                font-weight: bold;
                color: #3498db;
                margin-bottom: 5px;
            }
            
            /* Section Headers */
            .section-header {
                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                color: white;
                padding: 12px 20px;
                margin: 25px 0 15px 0;
                font-size: 16px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-radius: 5px;
                page-break-after: avoid;
                box-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
            }
            
            /* Transaction Items */
            .transaction-item {
                margin-bottom: 20px;
                border: 1px solid #ecf0f1;
                border-radius: 8px;
                overflow: hidden;
                page-break-inside: avoid;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                background: white;
            }
            
            .transaction-header {
                background: #f8f9fa;
                padding: 10px 15px;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .transaction-type {
                font-weight: bold;
                font-size: 14px;
                color: #2c3e50;
                text-transform: capitalize;
            }
            
            .transaction-date {
                color: #7f8c8d;
                font-size: 11px;
                font-weight: 500;
            }
            
            .transaction-content {
                padding: 15px;
            }
            
            /* Details Grid */
            .details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .detail-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #f1f2f6;
            }
            
            .detail-label {
                font-size: 11px;
                color: #7f8c8d;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            
            .detail-value {
                font-size: 12px;
                font-weight: 600;
                color: #2c3e50;
            }
            
            .detail-value.amount {
                color: #27ae60;
                font-size: 13px;
            }
            
            .detail-value.received {
                color: #3498db;
            }
            
            .detail-value.change {
                color: #e67e22;
            }
            
            .detail-value.location {
                color: #9b59b6;
                font-style: italic;
            }
            
            /* Bills Section */
            .bills-section {
                background: #f8f9fa;
                border-radius: 5px;
                padding: 12px;
                margin-top: 10px;
            }
            
            .bills-header {
                font-size: 11px;
                font-weight: 600;
                color: #34495e;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            
            .bills-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                gap: 6px;
            }
            
            .bill-item {
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 6px 8px;
                text-align: center;
                font-size: 10px;
                font-weight: 600;
                color: #2c3e50;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            
            /* Expenses Table */
            .expenses-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-size: 11px;
                page-break-inside: avoid;
            }
            
            .expenses-table th {
                background: #34495e;
                color: white;
                text-align: left;
                padding: 10px;
                font-weight: 600;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            
            .expenses-table td {
                padding: 10px;
                border-bottom: 1px solid #ecf0f1;
                vertical-align: top;
            }
            
            .expenses-table tr:nth-child(even) {
                background: #f8f9fa;
            }
            
            .expense-description {
                font-weight: 500;
                color: #2c3e50;
            }
            
            .expense-date {
                color: #7f8c8d;
                font-size: 10px;
            }
            
            .expense-amount {
                color: #e74c3c;
                font-weight: 600;
                text-align: right;
            }
            
            .expenses-total {
                background: #ecf0f1 !important;
                font-weight: bold;
                border-top: 2px solid #bdc3c7;
            }
            
            .expenses-total td {
                padding: 12px 10px;
                font-size: 12px;
            }
            
            /* Summary Section */
            .summary-section {
                margin-top: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 2px solid #ecf0f1;
                page-break-inside: avoid;
            }
            
            .summary-title {
                font-size: 16px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 15px;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .summary-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .summary-table td {
                padding: 10px 15px;
                font-size: 13px;
                border-bottom: 1px solid #d5dbdb;
            }
            
            .summary-table td:first-child {
                text-align: right;
                font-weight: 600;
                color: #34495e;
                width: 70%;
            }
            
            .summary-table td:last-child {
                text-align: right;
                font-weight: bold;
                width: 30%;
                font-size: 14px;
            }
            
            .summary-table tr:last-child {
                border-top: 2px solid #3498db;
                background: white;
            }
            
            .summary-table tr:last-child td {
                padding: 15px;
                font-size: 16px;
                font-weight: bold;
            }
            
            .amount-positive {
                color: #27ae60;
            }
            
            .amount-negative {
                color: #e74c3c;
            }
            
            .amount-sales {
                color: #27ae60;
            }
            
            .amount-expenses {
                color: #e74c3c;
            }
            
            /* Footer */
            .document-footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #ecf0f1;
                text-align: center;
                font-size: 10px;
                color: #95a5a6;
                page-break-inside: avoid;
            }
            
            .footer-company {
                font-weight: 600;
                color: #7f8c8d;
                margin-bottom: 5px;
            }
            
            .footer-date {
                font-style: italic;
            }
            
            /* Print Styles */
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .transaction-item {
                    page-break-inside: avoid;
                    margin-bottom: 15px;
                }
                
                .section-header {
                    page-break-after: avoid;
                }
                
                .summary-section {
                    page-break-inside: avoid;
                }
            }
        </style>
    </head>
    <body>
        <div class="document-container">
            <div class="header">
                <div class="company-info">
                    <div class="company-name">Huevos La Rural</div>
                    <div class="company-subtitle">Registro de Ventas y Transacciones</div>
                </div>
                <div class="document-info">
                    <div class="document-title">Reporte de Venta</div>
                    <div class="sale-name">${sale.name}</div>
                    <div class="document-meta">
                        <div>Fecha: ${creationDate}</div>
                        <div>Hora: ${creationTime}</div>
                    </div>
                </div>
            </div>
            
            <div class="section-header">Registro Detallado de Ventas</div>
    `;

    sortedTransactions.forEach(transaction => {
        const transactionDate = formatDate(transaction.timestamp);
        const transactionTime = customFormatTime(transaction.timestamp);

        let transactionType = '';
        if (transaction.type === 'carton') {
            transactionType = 'Cartones';
        } else if (transaction.type === 'half_carton') {
            transactionType = 'Medios Cartones';
        } else {
            transactionType = 'Cajas';
        }

        htmlContent += `
            <div class="transaction-item">
                <div class="transaction-header">
                    <div class="transaction-type">${transactionType}</div>
                    <div class="transaction-date">${transactionDate} - ${transactionTime}</div>
                </div>
                
                <div class="transaction-content">
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Cantidad</span>
                            <span class="detail-value">${transaction.quantity}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Precio Unitario</span>
                            <span class="detail-value">$${transaction.unitPrice.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Total Venta</span>
                            <span class="detail-value amount">$${transaction.total.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Recibido</span>
                            <span class="detail-value received">$${transaction.totalReceived.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Cambio</span>
                            <span class="detail-value change">$${transaction.change.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Ubicación</span>
                            <span class="detail-value location">${transaction.location || 'No especificada'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-item" style="margin-bottom: 15px;">
                        <span class="detail-label">Tipo de Venta</span>
                        <span class="detail-value">${transaction.saleType || 'No especificado'}</span>
                    </div>
                    
                    <div class="bills-section">
                        <div class="bills-header">Billetes Recibidos</div>
                        <div class="bills-grid">
        `;

        Object.entries(transaction.receivedMoney).forEach(([bill, count]) => {
            if (count > 0) {
                htmlContent += `
                            <div class="bill-item">$${bill} x${count}</div>
                `;
            }
        });

        htmlContent += `
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    if (sale.expenses && sale.expenses.length > 0) {
        const totalExpenses = sale.expenses.reduce((sum, expense) => sum + expense.amount, 0);

        htmlContent += `
            <div class="section-header">Registro de Gastos</div>
            
            <table class="expenses-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Descripción</th>
                        <th style="width: 30%;">Fecha y Hora</th>
                        <th style="width: 20%;">Monto</th>
                    </tr>
                </thead>
                <tbody>
        `;

        sale.expenses.forEach(expense => {
            const expenseDate = formatDate(expense.timestamp);
            const expenseTime = customFormatTime(expense.timestamp);

            htmlContent += `
                    <tr>
                        <td class="expense-description">${expense.description}</td>
                        <td class="expense-date">${expenseDate} - ${expenseTime}</td>
                        <td class="expense-amount">$${expense.amount.toFixed(2)}</td>
                    </tr>
            `;
        });

        htmlContent += `
                </tbody>
                <tfoot>
                    <tr class="expenses-total">
                        <td colspan="2">Total de Gastos:</td>
                        <td class="expense-amount">$${totalExpenses.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    const totalSales = sortedTransactions.reduce((sum, transaction) => sum + transaction.total, 0);
    const totalExpenses = sale.expenses ? sale.expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
    const netTotal = totalSales - totalExpenses;

    htmlContent += `
            <div class="summary-section">
                <div class="summary-title">Resumen Financiero</div>
                <table class="summary-table">
                    <tr>
                        <td>Total de Ventas:</td>
                        <td class="amount-sales">$${totalSales.toFixed(2)}</td>
                    </tr>
                    ${sale.expenses && sale.expenses.length > 0 ?
            `<tr>
                        <td>Total de Gastos:</td>
                        <td class="amount-expenses">$${totalExpenses.toFixed(2)}</td>
                    </tr>` : ''}
                    <tr>
                        <td>Balance Neto Final:</td>
                        <td class="${netTotal >= 0 ? 'amount-positive' : 'amount-negative'}">$${netTotal.toFixed(2)}</td>
                    </tr>
                </table>
            </div>
            
            <div class="document-footer">
                <div class="footer-company">Huevos La Rural - Registro Oficial</div>
                <div class="footer-date">Documento generado el ${formatDate(new Date())} a las ${customFormatTime(new Date())}</div>
            </div>
        </div>
    </body>
    </html>
    `;

    return htmlContent;
};