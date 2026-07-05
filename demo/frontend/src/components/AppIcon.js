import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

export default function AppIcon({ name, size = 20, color = COLORS.text, style }) {
  return <MaterialIcons name={name} size={size} color={color} style={style} />;
}
