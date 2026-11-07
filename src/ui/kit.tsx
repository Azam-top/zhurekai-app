import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type TextProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../lib/store';
import { Icon, type IconName } from './Icon';
import { color, font, radius, size, space } from './theme';

type Variant = 'body' | 'caption' | 'lead' | 'title' | 'hero' | 'label';
const variants = StyleSheet.create({
  body: { fontFamily: font.regular, fontSize: size.body, lineHeight: 25, color: color.ink },
  caption: { fontFamily: font.regular, fontSize: size.caption, lineHeight: 21, color: color.ink2 },
  label: { fontFamily: font.medium, fontSize: size.caption, lineHeight: 21, color: color.ink3 },
  lead: { fontFamily: font.semibold, fontSize: size.lead, lineHeight: 27, color: color.ink },
  title: { fontFamily: font.bold, fontSize: size.title, lineHeight: 31, color: color.ink },
  hero: { fontFamily: font.bold, fontSize: size.hero, lineHeight: 37, color: color.ink },
});

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  return <Text {...rest} style={[variants[v], style]} />;
}

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.xxl + insets.bottom, gap: space.lg };
  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {scroll
        ? <ScrollView style={styles.fill} contentContainerStyle={[pad, styles.column]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        : <View style={[styles.fill, pad, styles.column]}>{children}</View>}
    </KeyboardAvoidingView>
  );
}

export const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** Header for screens opened from another screen. */
export function SubHeader({ title }: { title: string }) {
  const t = useT();
  return (
    <View style={styles.subHeader}>
      <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={12} style={styles.backBtn}>
        <Icon name="back" color={color.ink} size={28} />
      </Pressable>
      <T v="title" accessibilityRole="header" style={styles.fill}>{title}</T>
    </View>
  );
}

export function Card({ children, tint }: { children: ReactNode; tint?: 'alt' | 'warn' | 'danger' | 'ok' }) {
  const bg = { alt: color.bgAlt, warn: color.warnBg, danger: color.dangerBg, ok: color.okBg }[tint ?? 'alt'];
  return <View style={[styles.card, { backgroundColor: bg }]}>{children}</View>;
}

type BtnKind = 'primary' | 'secondary' | 'danger' | 'quiet';
export function Button({ label, onPress, kind = 'secondary', disabled, icon }: { label: string; onPress: () => void; kind?: BtnKind; disabled?: boolean; icon?: IconName }) {
  const bg = { primary: color.accent, secondary: color.ink, danger: color.danger, quiet: color.bgAlt }[kind];
  const fg = kind === 'quiet' ? color.ink : color.white;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }]}>
      {icon && <Icon name={icon} color={fg} />}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ icon, label, detail, onPress }: { icon?: IconName; label: string; detail?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      {icon && <Icon name={icon} color={color.ink} />}
      <View style={styles.fill}>
        <T v="lead">{label}</T>
        {detail ? <T v="caption">{detail}</T> : null}
      </View>
      <Icon name="chevron" color={color.caption} size={20} />
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, hint, error, keyboardType, placeholder, secure }: {
  label: string; value: string; onChangeText: (v: string) => void; hint?: string; error?: string | null; keyboardType?: KeyboardTypeOptions; placeholder?: string; secure?: boolean;
}) {
  return (
    <View style={styles.field}>
      <T v="label">{label}</T>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholder={placeholder} placeholderTextColor={color.caption}
        secureTextEntry={secure} accessibilityLabel={label} style={[styles.input, error ? { borderColor: color.danger } : null]} />
      {error ? <T v="caption" style={{ color: color.danger }}>{error}</T> : hint ? <T v="caption">{hint}</T> : null}
    </View>
  );
}

export function Banner({ text, tint = 'warn', icon = 'alert' }: { text: string; tint?: 'warn' | 'danger' | 'ok'; icon?: IconName }) {
  const fg = { warn: color.warn, danger: color.danger, ok: color.ok }[tint];
  return (
    <Card tint={tint}>
      <View style={styles.banner}>
        <Icon name={icon} color={fg} />
        <T style={[styles.fill, { color: fg, fontFamily: font.medium }]}>{text}</T>
      </View>
    </Card>
  );
}

export function Segmented<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.segmentItem, on && styles.segmentOn]}>
            <Text style={[styles.segmentText, { color: on ? color.white : color.ink }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const callNumber = (phone: string) => Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);

export function Call103() {
  const t = useT();
  return <Button kind="danger" icon="phone" label={t('call103')} onPress={() => callNumber('103')} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  column: { backgroundColor: color.bg, width: '100%', maxWidth: 480, alignSelf: 'center', flexGrow: 1 },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  btn: { minHeight: size.touch, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  btnText: { fontFamily: font.bold, fontSize: size.lead, lineHeight: 26, textAlign: 'center', flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: size.touch + 8, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: color.line },
  field: { gap: space.xs },
  input: { minHeight: size.touch, borderWidth: 1.5, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.md, fontFamily: font.regular, fontSize: size.body, color: color.ink, backgroundColor: color.bg },
  banner: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  segment: { flexDirection: 'row', backgroundColor: color.bgAlt, borderRadius: radius.md, padding: space.xs, gap: space.xs },
  segmentItem: { flex: 1, minHeight: 48, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xs },
  segmentOn: { backgroundColor: color.ink },
  segmentText: { fontFamily: font.semibold, fontSize: 16, textAlign: 'center' },
});
