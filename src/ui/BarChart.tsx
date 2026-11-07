import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { T } from './kit';
import { color, space } from './theme';

export interface Bar { key: string; label: string; value: number | null; low?: number | null; text: string }

const HEIGHT = 130;

/** One series, so no legend. Tap a column to read its value; the screen reader gets all values. */
export function BarChart({ title, bars, goal, goalLabel, emptyText, summaryLabel }: {
  title: string; bars: Bar[]; goal?: number; goalLabel?: string; emptyText: string; summaryLabel: string;
}) {
  const [selected, setSelected] = useState(bars.length - 1);
  const values = bars.flatMap((b) => (b.value === null ? [] : [b.value]));
  if (!values.length) return <View style={styles.wrap}><T v="lead">{title}</T><T v="caption">{emptyText}</T></View>;

  const hasLow = bars.some((b) => b.low != null);
  const top = Math.max(...values, goal ?? 0) * 1.05;
  const bottom = hasLow ? Math.max(0, Math.min(...bars.flatMap((b) => (b.low == null ? [] : [b.low]))) - 10) : 0;
  const y = (v: number) => ((v - bottom) / (top - bottom)) * HEIGHT;
  const current = bars[selected];

  return (
    <View style={styles.wrap} accessible accessibilityLabel={summaryLabel}>
      <View style={styles.head}>
        <T v="lead">{title}</T>
        <T v="lead">{current.text}</T>
      </View>
      <View style={styles.plot}>
        {goal ? (
          <View style={[styles.goal, { bottom: y(goal) }]} pointerEvents="none">
            <T v="caption" style={styles.goalText}>{goalLabel}</T>
          </View>
        ) : null}
        {bars.map((b, i) => (
          <Pressable key={b.key} onPress={() => setSelected(i)} style={styles.col} accessibilityRole="button" accessibilityLabel={`${b.label}: ${b.text}`}>
            <View style={styles.track}>
              {b.value !== null && (
                <View style={[styles.bar, {
                  height: Math.max(4, y(b.value) - (b.low != null ? y(b.low) : 0)),
                  marginBottom: b.low != null ? y(b.low) : 0,
                  opacity: i === selected ? 1 : 0.55,
                }]} />
              )}
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.labels}>
        {bars.map((b, i) => (
          <T key={b.key} v="caption" style={[styles.label, i === selected && styles.labelOn]}>{b.label}</T>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, backgroundColor: color.bgAlt, borderRadius: 16, padding: space.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, flexWrap: 'wrap' },
  plot: { height: HEIGHT, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: color.line, marginTop: space.sm },
  col: { flex: 1, alignItems: 'center', height: HEIGHT },
  track: { flex: 1, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: 18, backgroundColor: color.accent, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  goal: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: color.ink2, zIndex: 1 },
  goalText: { position: 'absolute', right: 0, top: -22, fontSize: 13, lineHeight: 18 },
  labels: { flexDirection: 'row' },
  label: { flex: 1, textAlign: 'center' },
  labelOn: { color: color.ink, fontWeight: '600' },
});
