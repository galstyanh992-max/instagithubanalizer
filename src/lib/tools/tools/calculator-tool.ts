// ─── Agent OS — Stage 3: Calculator Tool ────────────────────────
// A simple calculator tool that evaluates mathematical expressions.
// Demonstrates a basic tool with no side effects and 'none' permission.
// Safe for all agents to use.

import type { ITool, ToolExecutionContext, ToolExecutionResult, ToolInputSchema } from '../types';

// ─── Supported Operations ────────────────────────────────────

type MathOp = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'modulo' | 'sqrt' | 'abs';

const OP_DESCRIPTIONS: Record<MathOp, string> = {
  add: 'Add two numbers (a + b)',
  subtract: 'Subtract b from a (a - b)',
  multiply: 'Multiply two numbers (a * b)',
  divide: 'Divide a by b (a / b)',
  power: 'Raise a to the power of b (a ^ b)',
  modulo: 'Modulo of a by b (a % b)',
  sqrt: 'Square root of a',
  abs: 'Absolute value of a',
};

// ─── Input Schema ────────────────────────────────────────────

const CALCULATOR_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      enum: Object.keys(OP_DESCRIPTIONS),
      description: 'The mathematical operation to perform',
    },
    a: {
      type: 'number',
      description: 'First operand',
    },
    b: {
      type: 'number',
      description: 'Second operand (not needed for sqrt, abs)',
    },
  },
  required: ['operation', 'a'],
};

// ─── Calculator Tool Implementation ──────────────────────────

export const calculatorTool: ITool = {
  id: 'calculator',
  name: 'Calculator',
  description:
    'Performs mathematical calculations. Supports add, subtract, multiply, divide, power, modulo, sqrt, abs.',
  version: '1.0.0',
  requiredPermission: 'none',
  inputSchema: CALCULATOR_SCHEMA,

  functionDefinition: {
    name: 'calculator',
    description:
      'Perform a mathematical calculation. Provide an operation and operands.',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: Object.keys(OP_DESCRIPTIONS),
          description: 'The mathematical operation to perform',
        },
        a: {
          type: 'number',
          description: 'First operand',
        },
        b: {
          type: 'number',
          description: 'Second operand (not needed for sqrt, abs)',
        },
      },
      required: ['operation', 'a'],
    },
  },

  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { operation, a, b } = context.args as {
      operation: MathOp;
      a: number;
      b?: number;
    };

    const numA = Number(a);
    const numB = b !== undefined ? Number(b) : undefined;

    // Validate operation
    if (!OP_DESCRIPTIONS[operation]) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `Unknown operation: ${operation}. Supported: ${Object.keys(OP_DESCRIPTIONS).join(', ')}`,
        error: `Invalid operation: ${operation}`,
        durationMs: 0,
      };
    }

    let result: number;

    try {
      switch (operation) {
        case 'add':
          if (numB === undefined) throw new Error('Operand "b" is required for add');
          result = numA + numB;
          break;
        case 'subtract':
          if (numB === undefined) throw new Error('Operand "b" is required for subtract');
          result = numA - numB;
          break;
        case 'multiply':
          if (numB === undefined) throw new Error('Operand "b" is required for multiply');
          result = numA * numB;
          break;
        case 'divide':
          if (numB === undefined) throw new Error('Operand "b" is required for divide');
          if (numB === 0) throw new Error('Division by zero');
          result = numA / numB;
          break;
        case 'power':
          if (numB === undefined) throw new Error('Operand "b" is required for power');
          result = Math.pow(numA, numB);
          break;
        case 'modulo':
          if (numB === undefined) throw new Error('Operand "b" is required for modulo');
          if (numB === 0) throw new Error('Modulo by zero');
          result = numA % numB;
          break;
        case 'sqrt':
          if (numA < 0) throw new Error('Cannot compute square root of negative number');
          result = Math.sqrt(numA);
          break;
        case 'abs':
          result = Math.abs(numA);
          break;
        default:
          throw new Error(`Unimplemented operation: ${operation}`);
      }

      // Format the expression nicely
      const expression = formatExpression(operation, numA, numB);

      return {
        success: true,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `${expression} = ${result}`,
        durationMs: 0,
        metadata: { operation, operands: [numA, numB], result },
      };
    } catch (error) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: 0,
      };
    }
  },
};

// ─── Helper ──────────────────────────────────────────────────

function formatExpression(op: MathOp, a: number, b?: number): string {
  switch (op) {
    case 'add': return `${a} + ${b}`;
    case 'subtract': return `${a} - ${b}`;
    case 'multiply': return `${a} × ${b}`;
    case 'divide': return `${a} ÷ ${b}`;
    case 'power': return `${a}^${b}`;
    case 'modulo': return `${a} % ${b}`;
    case 'sqrt': return `√${a}`;
    case 'abs': return `|${a}|`;
    default: return `${a} ? ${b}`;
  }
}
