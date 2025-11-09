import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as appInsights from 'applicationinsights';

// Initialize Application Insights
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start();
}

// Mock order database
const ORDERS: Record<string, any> = {
  '12345': {
    orderId: '12345',
    status: 'In Transit',
    eta: '2025-11-15',
    trackingNumber: 'TRK-98765-ABCD',
    items: ['Laptop Stand', 'Wireless Mouse'],
  },
  '67890': {
    orderId: '67890',
    status: 'Delivered',
    eta: '2025-11-10',
    trackingNumber: 'TRK-54321-WXYZ',
    items: ['USB-C Cable', 'Power Adapter'],
  },
  '11111': {
    orderId: '11111',
    status: 'Processing',
    eta: '2025-11-20',
    trackingNumber: 'TRK-11111-QRST',
    items: ['Monitor', 'HDMI Cable'],
  },
};

export async function GetOrderStatus(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('GetOrderStatus function triggered');

  try {
    const orderId = request.query.get('orderId');

    if (!orderId) {
      return {
        status: 400,
        jsonBody: {
          error: 'Missing required parameter: orderId',
        },
      };
    }

    const order = ORDERS[orderId];

    if (!order) {
      return {
        status: 404,
        jsonBody: {
          error: `Order ${orderId} not found`,
        },
      };
    }

    // Track custom event
    if (appInsights.defaultClient) {
      appInsights.defaultClient.trackEvent({
        name: 'OrderStatusRetrieved',
        properties: {
          orderId,
          status: order.status,
        },
      });
    }

    return {
      status: 200,
      jsonBody: order,
    };
  } catch (error: any) {
    context.error('Error in GetOrderStatus:', error);

    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error.message,
      },
    };
  }
}

app.http('GetOrderStatus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetOrderStatus,
});
