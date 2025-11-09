import SwaggerParser from '@apidevtools/swagger-parser';
import { expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('OpenAPI Contract Tests', () => {

  test('openapi.yaml is valid OpenAPI 3.0 spec', async () => {
    const specPath = path.join(__dirname, '../demos/03-agent-with-tools/function-tool/openapi.yaml');

    // Validate the spec
    const api = await SwaggerParser.validate(specPath);

    expect(api).toBeDefined();
    expect(api.openapi).toMatch(/^3\.0\.\d+$/); // OpenAPI 3.0.x
  });

  test('GetOrderStatus endpoint is documented', async () => {
    const specPath = path.join(__dirname, '../demos/03-agent-with-tools/function-tool/openapi.yaml');
    const api = await SwaggerParser.validate(specPath);

    expect(api.paths).toHaveProperty('/api/GetOrderStatus');

    const getOrderStatus = api.paths['/api/GetOrderStatus'].get;
    expect(getOrderStatus).toBeDefined();
    expect(getOrderStatus.summary).toBeTruthy();
    expect(getOrderStatus.parameters).toBeDefined();

    // Verify orderId parameter
    const orderIdParam = getOrderStatus.parameters.find((p: any) => p.name === 'orderId');
    expect(orderIdParam).toBeDefined();
    expect(orderIdParam.required).toBe(true);
    expect(orderIdParam.schema.type).toBe('string');

    // Verify response schema
    expect(getOrderStatus.responses['200']).toBeDefined();
    expect(getOrderStatus.responses['200'].content['application/json'].schema).toBeDefined();
  });

  test('CreateTicket endpoint is documented', async () => {
    const specPath = path.join(__dirname, '../demos/03-agent-with-tools/function-tool/openapi.yaml');
    const api = await SwaggerParser.validate(specPath);

    expect(api.paths).toHaveProperty('/api/CreateTicket');

    const createTicket = api.paths['/api/CreateTicket'].post;
    expect(createTicket).toBeDefined();
    expect(createTicket.summary).toBeTruthy();
    expect(createTicket.requestBody).toBeDefined();

    // Verify request schema
    const requestSchema = createTicket.requestBody.content['application/json'].schema;
    expect(requestSchema).toBeDefined();
    expect(requestSchema.required).toContain('title');
    expect(requestSchema.required).toContain('description');
    expect(requestSchema.required).toContain('customerId');
  });

  test('All schemas are defined in components', async () => {
    const specPath = path.join(__dirname, '../demos/03-agent-with-tools/function-tool/openapi.yaml');
    const api = await SwaggerParser.validate(specPath);

    expect(api.components).toBeDefined();
    expect(api.components.schemas).toBeDefined();

    // Required schemas
    expect(api.components.schemas).toHaveProperty('OrderStatusResponse');
    expect(api.components.schemas).toHaveProperty('CreateTicketRequest');
    expect(api.components.schemas).toHaveProperty('CreateTicketResponse');
    expect(api.components.schemas).toHaveProperty('ErrorResponse');
  });

  test('Error responses are documented', async () => {
    const specPath = path.join(__dirname, '../demos/03-agent-with-tools/function-tool/openapi.yaml');
    const api = await SwaggerParser.validate(specPath);

    const getOrderStatus = api.paths['/api/GetOrderStatus'].get;

    // 400 Bad Request
    expect(getOrderStatus.responses['400']).toBeDefined();
    expect(getOrderStatus.responses['400'].description).toBeTruthy();

    // 404 Not Found
    expect(getOrderStatus.responses['404']).toBeDefined();

    // 500 Internal Server Error
    expect(getOrderStatus.responses['500']).toBeDefined();
  });

  test('Function descriptions are suitable for LLM tool calling', async () => {
    const specPath = path.join(__dirname, '../demos/03-agent-with-tools/function-tool/openapi.yaml');
    const api = await SwaggerParser.validate(specPath);

    // GetOrderStatus description should be clear for LLM
    const getOrderStatus = api.paths['/api/GetOrderStatus'].get;
    expect(getOrderStatus.description.length).toBeGreaterThan(20); // Non-trivial description
    expect(getOrderStatus.description.toLowerCase()).toContain('order');

    // CreateTicket description
    const createTicket = api.paths['/api/CreateTicket'].post;
    expect(createTicket.description.length).toBeGreaterThan(20);
    expect(createTicket.description.toLowerCase()).toContain('ticket');
  });

  test('No $ref errors in dereferenced spec', async () => {
    const specPath = path.join(__dirname, '../demos/03-agent-with-tools/function-tool/openapi.yaml');

    // Dereference all $refs
    const api = await SwaggerParser.dereference(specPath);

    // If we get here without error, all $refs resolved successfully
    expect(api).toBeDefined();
  });

});
