import { Image } from 'expo-image';
import { View, StyleSheet } from 'react-native';

const LOGO = require('@/assets/images/hyperlink_logo.png');

export function HeaderLogo() {
  return (
    <View style={styles.wrap}>
      <Image
        source={LOGO}
        style={styles.logo}
        contentFit="contain"
        accessibilityLabel="Hyperlink"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  logo: {
    height: 32,
    width: 140,
  },
});
