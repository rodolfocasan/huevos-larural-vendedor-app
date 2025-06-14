// Components/Utils/pdfFormat.js
import React from 'react'

import { formatDate } from './Constants';





// Formateo de hora modificado para añadir ceros a la izquierda
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
        <style>
            body {
                font-family: 'Helvetica', sans-serif;
                margin: 0;
                padding: 40px;
                color: #333;
                line-height: 1.5;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 40px;
                border-bottom: 2px solid #007bff;
                padding-bottom: 20px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #007bff;
            }
            .sale-info {
                text-align: right;
                font-size: 14px;
            }
            .sale-info .sale-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            .section-header {
                background-color: #f8f9fa;
                padding: 12px 15px;
                margin: 30px 0 15px 0;
                border-left: 5px solid #007bff;
                font-size: 18px;
                font-weight: bold;
            }
            .transaction-item {
                margin-bottom: 25px;
                padding: 15px;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                page-break-inside: avoid;
            }
            .transaction-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #e9ecef;
            }
            .transaction-title {
                font-weight: bold;
                font-size: 16px;
                color: #007bff;
            }
            .transaction-date {
                color: #6c757d;
                font-size: 14px;
            }
            .details-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }
            .details-table td {
                padding: 8px 5px;
                vertical-align: top;
            }
            .details-table td:first-child {
                width: 40%;
                text-align: left;
                color: #6c757d;
            }
            .details-table td:last-child {
                width: 60%;
                text-align: right;
                font-weight: 500;
            }
            .bills-details {
                background-color: #f8f9fa;
                border-radius: 5px;
                padding: 10px;
                margin-top: 10px;
            }
            .bills-header {
                font-weight: 500;
                margin-bottom: 8px;
                color: #495057;
            }
            .bills-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                gap: 8px;
            }
            .bill-item {
                background-color: #ffffff;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 5px 8px;
                text-align: center;
            }
            .expenses-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
            }
            .expenses-table th {
                background-color: #f8f9fa;
                text-align: left;
                padding: 10px;
                font-weight: 500;
                border-bottom: 2px solid #dee2e6;
            }
            .expenses-table td {
                padding: 12px 10px;
                border-bottom: 1px solid #e9ecef;
            }
            .expenses-table td:last-child {
                text-align: right;
                font-weight: 500;
            }
            .total-section {
                margin-top: 40px;
                border-top: 2px solid #dee2e6;
                padding-top: 20px;
            }
            .summary-table {
                width: 100%;
                border-collapse: collapse;
            }
            .summary-table tr:last-child {
                font-size: 18px;
                font-weight: bold;
                border-top: 1px solid #dee2e6;
            }
            .summary-table td {
                padding: 8px 5px;
            }
            .summary-table td:first-child {
                width: 70%;
                text-align: right;
            }
            .summary-table td:last-child {
                width: 30%;
                text-align: right;
            }
            .expense-amount {
                color: #dc3545;
            }
            .sale-amount {
                color: #28a745;
            }
            .page-footer {
                margin-top: 50px;
                text-align: center;
                font-size: 12px;
                color: #6c757d;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">Huevos La Rural</div>
            <div class="sale-info">
                <div class="sale-name">${sale.name}</div>
                <div>Fecha: ${creationDate}</div>
                <div>Hora: ${creationTime}</div>
            </div>
        </div>
        
        <div class="section-header">Registro de Ventas</div>
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
                <div class="transaction-title">${transactionType}</div>
                <div class="transaction-date">${transactionDate} - ${transactionTime}</div>
            </div>
            
            <table class="details-table">
                <tr>
                    <td>Cantidad:</td>
                    <td>${transaction.quantity}</td>
                </tr>
                <tr>
                    <td>Precio unitario:</td>
                    <td>$${transaction.unitPrice.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Total venta:</td>
                    <td class="sale-amount">$${transaction.total.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Recibido:</td>
                    <td>$${transaction.totalReceived.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Cambio:</td>
                    <td>$${transaction.change.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Ubicación:</td>
                    <td>${transaction.location || 'No especificada'}</td>
                </tr>
                <tr>
                    <td>Tipo de venta:</td>
                    <td>${transaction.saleType || 'No especificado'}</td>
                </tr>
            </table>
            
            <div class="bills-details">
                <div class="bills-header">Billetes recibidos:</div>
                <div class="bills-grid">
        `;

        Object.entries(transaction.receivedMoney).forEach(([bill, count]) => {
            if (count > 0) {
                htmlContent += `
                <div class="bill-item">
                    $${bill} x ${count}
                </div>
                `;
            }
        });

        htmlContent += `
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
                    <th>Descripción</th>
                    <th>Fecha y Hora</th>
                    <th>Monto</th>
                </tr>
            </thead>
            <tbody>
        `;

        sale.expenses.forEach(expense => {
            const expenseDate = formatDate(expense.timestamp);
            const expenseTime = customFormatTime(expense.timestamp);

            htmlContent += `
            <tr>
                <td>${expense.description}</td>
                <td>${expenseDate} - ${expenseTime}</td>
                <td class="expense-amount">$${expense.amount.toFixed(2)}</td>
            </tr>
            `;
        });

        htmlContent += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2" style="text-align: right; font-weight: bold;">Total Gastos:</td>
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
        <div class="total-section">
            <table class="summary-table">
                <tr>
                    <td>Total Ventas:</td>
                    <td class="sale-amount">$${totalSales.toFixed(2)}</td>
                </tr>
                ${sale.expenses && sale.expenses.length > 0 ?
            `<tr>
                    <td>Total Gastos:</td>
                    <td class="expense-amount">$${totalExpenses.toFixed(2)}</td>
                </tr>` : ''}
                <tr>
                    <td>Balance Neto:</td>
                    <td>${netTotal >= 0 ?
            `<span class="sale-amount">$${netTotal.toFixed(2)}</span>` :
            `<span class="expense-amount">$${netTotal.toFixed(2)}</span>`}</td>
                </tr>
            </table>
        </div>
        
        <div class="page-footer">
            Este documento es un registro oficial de Huevos La Rural - Generado el ${formatDate(new Date())}
        </div>
    </body>
    </html>
    `;

    return htmlContent;
};