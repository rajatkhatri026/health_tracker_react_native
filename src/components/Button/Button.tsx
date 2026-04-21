import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { styles } from './Button.styles';

interface ButtonProps {
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
}) => {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], styles[size], (disabled || loading) && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? '#92A3FD' : '#fff'} size="small" />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;
