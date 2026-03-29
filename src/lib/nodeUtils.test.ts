import { describe, it, expect } from 'vitest';
import { generateNodeLabel, createNode, NODE_COLORS } from './nodeUtils';

describe('generateNodeLabel', () => {
  it('generates single-letter labels for indices 0–25', () => {
    expect(generateNodeLabel(0)).toBe('Node A');
    expect(generateNodeLabel(1)).toBe('Node B');
    expect(generateNodeLabel(25)).toBe('Node Z');
  });

  it('generates double-letter labels starting at index 26', () => {
    expect(generateNodeLabel(26)).toBe('Node AA');
    expect(generateNodeLabel(27)).toBe('Node AB');
    expect(generateNodeLabel(51)).toBe('Node AZ');
    expect(generateNodeLabel(52)).toBe('Node BA');
  });

  it('generates triple-letter labels at index 702', () => {
    // 702 = 26 + 26² = 26 + 676 → first "AAA"
    expect(generateNodeLabel(702)).toBe('Node AAA');
  });
});

describe('createNode', () => {
  it('returns a node with default RF properties', () => {
    const node = createNode(51.5, -0.1, 0);
    expect(node.lat).toBe(51.5);
    expect(node.lng).toBe(-0.1);
    expect(node.antennaHeightM).toBe(5);
    expect(node.txPowerDbm).toBe(20);
    expect(node.antennaGainDbi).toBe(2.15);
    expect(node.role).toBe('client');
  });

  it('assigns the correct auto-generated name', () => {
    expect(createNode(0, 0, 0).name).toBe('Node A');
    expect(createNode(0, 0, 25).name).toBe('Node Z');
    expect(createNode(0, 0, 26).name).toBe('Node AA');
  });

  it('cycles through the 8 palette colours', () => {
    for (let i = 0; i < NODE_COLORS.length; i++) {
      expect(createNode(0, 0, i).color).toBe(NODE_COLORS[i]);
    }
    // wraps back to first colour at index 8
    expect(createNode(0, 0, NODE_COLORS.length).color).toBe(NODE_COLORS[0]);
  });

  it('generates a unique nanoid for each node', () => {
    const ids = new Set(Array.from({ length: 10 }, (_, i) => createNode(0, 0, i).id));
    expect(ids.size).toBe(10);
  });
});
