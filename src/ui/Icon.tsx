import Svg, { Circle, Path } from 'react-native-svg';

export type IconName = 'today' | 'pill' | 'chart' | 'more' | 'check' | 'chevron' | 'phone' | 'plus' | 'band' | 'card' | 'doc' | 'lang' | 'user' | 'cloud' | 'alert' | 'back' | 'heart';

const paths: Record<IconName, string[]> = {
  heart: ['M12 20C6 16 3 12.500 3 8.500 3 6 5 4 7.500 4c1.800 0 3.500 1 4.500 2.700C13 5 14.700 4 16.500 4 19 4 21 6 21 8.500c0 4-3 7.500-9 11.500Z'],
  today: ['M4 11.5 12 5l8 6.5', 'M6 10v9h12v-9'],
  pill: ['M10.5 20.5a5 5 0 0 1-7-7l9-9a5 5 0 0 1 7 7z', 'm8 9 7 7'],
  chart: ['M5 20v-7', 'M12 20V5', 'M19 20v-10'],
  more: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  chevron: ['m9 5 7 7-7 7'],
  back: ['m15 5-7 7 7 7'],
  phone: ['M6 3h3l2 5-2.5 1.5a11 11 0 0 0 5.5 5.5L15.5 12.500l5 2V18a3 3 0 0 1-3 3A15 15 0 0 1 3 6.500 3 3 0 0 1 6 3Z'],
  plus: ['M12 5v14', 'M5 12h14'],
  band: ['M8 8V3h8v5', 'M8 16v5h8v-5', 'M7 8h10v8H7z'],
  card: ['M3 6h18v12H3z', 'M7 15h4', 'M15 9v4', 'M13 11h4'],
  doc: ['M6 3h8l4 4v14H6z', 'M14 3v4h4', 'M9 13h6', 'M9 17h6'],
  lang: ['M3 12h18', 'M12 3c3 3 3 15 0 18', 'M12 3c-3 3-3 15 0 18'],
  user: ['M5 20c1-4 4-6 7-6s6 2 7 6'],
  cloud: ['M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 10.500 3.800 3.800 0 0 1 17.500 18z'],
  alert: ['M12 4 2.500 20h19z', 'M12 10v4', 'M12 17v.5'],
};

export function Icon({ name, color, size = 24 }: { name: IconName; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {paths[name].map((d) => <Path key={d} d={d} />)}
      {name === 'lang' && <Circle cx={12} cy={12} r={9} />}
      {name === 'user' && <Circle cx={12} cy={8} r={4} />}
    </Svg>
  );
}
