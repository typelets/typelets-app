import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme';
import { LIGHT_THEME_PRESETS, DARK_THEME_PRESETS } from '../theme/presets';
import { Card } from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { clearUserEncryptionData } from '../lib/encryption';
import { forceGlobalMasterPasswordRefresh } from '../hooks/useMasterPassword';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '../constants/version';
import { UsageBottomSheet } from '../components/settings/UsageBottomSheet';

interface Props {
  onLogout?: () => void;
  navigation?: any;
}

export default function SettingsScreen({ onLogout, navigation }: Props) {
  const theme = useTheme();
  const { user } = useUser();
  const router = useRouter();

  // Bottom sheet refs
  const themeModeSheetRef = useRef<BottomSheetModal>(null);
  const themeColorSheetRef = useRef<BottomSheetModal>(null);
  const securitySheetRef = useRef<BottomSheetModal>(null);
  const viewModeSheetRef = useRef<BottomSheetModal>(null);
  const usageSheetRef = useRef<BottomSheetModal>(null);

  // Scroll tracking
  const scrollY = useRef(new Animated.Value(0)).current;

  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Snap points
  const themeModeSnapPoints = useMemo(() => ['45%'], []);
  const themeColorSnapPoints = useMemo(() => ['80%'], []);
  const securitySnapPoints = useMemo(() => ['70%'], []);
  const viewModeSnapPoints = useMemo(() => ['40%'], []);
  const usageSnapPoints = useMemo(() => ['50%'], []);

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );


  // Load view mode preference
  useEffect(() => {
    const loadViewMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('viewMode');
        if (savedMode === 'grid' || savedMode === 'list') {
          setViewMode(savedMode);
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Failed to load view mode:', error);
        }
      }
    };
    loadViewMode();
  }, []);

  const saveViewMode = async (mode: 'list' | 'grid') => {
    try {
      setViewMode(mode);
      await AsyncStorage.setItem('viewMode', mode);
    } catch (error) {
      if (__DEV__) console.error('Failed to save view mode:', error);
      Alert.alert('Error', 'Failed to save view mode preference');
    }
  };

  const handleResetMasterPassword = async () => {
    Alert.alert(
      'Change Master Password',
      'This will clear your current master password and take you to set up a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user?.id) {
                await clearUserEncryptionData(user.id);

                // Trigger global refresh of all master password hook instances
                forceGlobalMasterPasswordRefresh();

                // The global refresh should automatically show the master password screen
                // No navigation needed since AppWrapper will detect the state change
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to change master password. Please try again.');
              if (__DEV__) console.error('Change master password error:', error);
            }
          }
        }
      ]
    );
  };

  const settingsItems = [
    {
      section: 'SECURITY',
      items: [
        {
          title: 'Security',
          subtitle: 'Learn how we protect your data',
          icon: 'shield-checkmark-outline',
          onPress: () => securitySheetRef.current?.present(),
        },
        {
          title: 'Change Master Password',
          subtitle: 'Reset your encryption password',
          icon: 'key-outline',
          onPress: handleResetMasterPassword,
        },
        {
          title: 'Logout',
          subtitle: 'Sign out of your account',
          icon: 'log-out-outline',
          isDestructive: true,
          onPress: () => {
            Alert.alert(
              'Logout',
              'Are you sure you want to logout? You\'ll need to enter your master password again.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: onLogout }
              ]
            );
          },
        },
      ],
    },
    {
      section: 'DATA',
      items: [
        {
          title: 'Usage & Limits',
          subtitle: 'View storage and note limits',
          icon: 'pie-chart-outline',
          onPress: () => usageSheetRef.current?.present(),
        },
        {
          title: 'Sync Status',
          subtitle: 'Last synced: Just now',
          icon: 'sync-outline',
          onPress: undefined,
        },
      ],
    },
    {
      section: 'PREFERENCES',
      items: [
        {
          title: 'View Mode',
          subtitle: viewMode === 'list' ? 'List' : 'Grid',
          icon: viewMode === 'list' ? 'list-outline' : 'grid-outline',
          onPress: () => viewModeSheetRef.current?.present(),
        },
        {
          title: 'Theme Mode',
          subtitle: theme.themeMode === 'system' ? 'System' : theme.themeMode === 'dark' ? 'Dark' : 'Light',
          icon: theme.themeMode === 'system' ? 'phone-portrait-outline' : theme.isDark ? 'moon-outline' : 'sunny-outline',
          onPress: () => themeModeSheetRef.current?.present(),
        },
        {
          title: 'Theme Colors',
          subtitle: theme.isDark
            ? DARK_THEME_PRESETS[theme.darkTheme].name
            : LIGHT_THEME_PRESETS[theme.lightTheme].name,
          icon: 'color-palette-outline',
          onPress: () => themeColorSheetRef.current?.present(),
        },
      ],
    },
    {
      section: 'ABOUT',
      items: [
        {
          title: 'Version',
          subtitle: APP_VERSION,
          icon: 'information-circle-outline',
          onPress: undefined,
        },
        {
          title: 'Open Source',
          subtitle: 'View source code on GitHub',
          icon: 'logo-github',
          onPress: () => Linking.openURL('https://github.com/typelets/typelets-app'),
        },
        {
          title: "What's New",
          subtitle: 'See latest updates and changes',
          icon: 'newspaper-outline',
          onPress: () => Linking.openURL('https://github.com/typelets/typelets-app/blob/main/CHANGELOG.md'),
        },
        {
          title: 'Support',
          subtitle: 'Get help and report issues',
          icon: 'help-circle-outline',
          onPress: () => Linking.openURL('https://github.com/typelets/typelets-app/issues'),
        },
        {
          title: 'Privacy Policy',
          subtitle: 'View our privacy policy',
          icon: 'shield-outline',
          onPress: () => Linking.openURL('https://typelets.com/privacy'),
        },
        {
          title: 'Terms of Service',
          subtitle: 'View our terms of service',
          icon: 'document-text-outline',
          onPress: () => Linking.openURL('https://typelets.com/terms'),
        },
      ],
    },
  ];

  // Animated divider opacity using interpolate
  const dividerOpacity = scrollY.interpolate({
    inputRange: [0, 20],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with back button */}
      <View>
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.muted }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.mutedForeground} style={{ marginLeft: -2 }} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Animated.View style={[styles.headerDivider, { backgroundColor: theme.colors.border, opacity: dividerOpacity }]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.sectionsContainer}>
          {settingsItems.map((section, sectionIndex) => (
            <View key={section.section} style={[styles.section, sectionIndex === 0 && styles.firstSection]}>
              <Text style={[styles.sectionTitle, sectionIndex === 0 && styles.firstSectionTitle, { color: theme.colors.mutedForeground }]}>
                {section.section}
              </Text>

            {section.items.map((item) => (
              <View key={item.title} style={styles.settingCardContainer}>
                <Card>
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={item.onPress}
                  >
                    <View style={styles.settingItemLeft}>
                      <View style={[
                        styles.iconContainer,
                        {
                          backgroundColor: theme.colors.muted
                        }
                      ]}>
                        <Ionicons
                          name={item.icon as any}
                          size={20}
                          color={theme.colors.foreground}
                        />
                      </View>
                      <View style={styles.settingItemText}>
                        <Text style={[
                          styles.settingItemTitle,
                          {
                            color: theme.colors.foreground
                          }
                        ]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.settingItemSubtitle, { color: theme.colors.mutedForeground }]}>
                          {item.subtitle}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.settingItemRight}>
                      {item.toggle ? (
                        <View style={[
                          styles.toggle,
                          { backgroundColor: item.value ? theme.colors.primary : theme.colors.muted }
                        ]}>
                          <View style={[
                            styles.toggleThumb,
                            {
                              backgroundColor: theme.colors.background,
                              transform: [{ translateX: item.value ? 16 : 0 }]
                            }
                          ]} />
                        </View>
                      ) : item.onPress ? (
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </Card>
              </View>
            ))}
          </View>
          ))}

        </View>
      </ScrollView>

      {/* Theme Mode Selection Bottom Sheet */}
      <BottomSheetModal
        ref={themeModeSheetRef}
        snapPoints={themeModeSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        topInset={45}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
      >
        <BottomSheetView>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.foreground }]}>
              Theme Mode
            </Text>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.muted }]}
              onPress={() => themeModeSheetRef.current?.dismiss()}
            >
              <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.bottomSheetContent, { paddingTop: 16 }]}>
            {[
              { mode: 'light', title: 'Light', subtitle: 'Always use light theme', icon: 'sunny-outline' },
              { mode: 'dark', title: 'Dark', subtitle: 'Always use dark theme', icon: 'moon-outline' },
              { mode: 'system', title: 'System', subtitle: 'Follow system setting', icon: 'phone-portrait-outline' }
            ].map((option) => (
              <TouchableOpacity
                key={option.mode}
                style={[styles.optionItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => {
                  theme.setThemeMode(option.mode as any);
                  themeModeSheetRef.current?.dismiss();
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: theme.colors.muted }]}>
                  <Ionicons name={option.icon as any} size={20} color={theme.colors.foreground} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.optionSubtitle, { color: theme.colors.mutedForeground }]}>
                      {option.subtitle}
                    </Text>
                  </View>
                  {theme.themeMode === option.mode && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Theme Color Selection Bottom Sheet */}
      <BottomSheetModal
        ref={themeColorSheetRef}
        snapPoints={themeColorSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        topInset={45}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.foreground }]}>
              Theme Colors
            </Text>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.muted }]}
              onPress={() => themeColorSheetRef.current?.dismiss()}
            >
              <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <BottomSheetScrollView
            style={styles.bottomSheetScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Light Themes Section */}
            <View style={styles.themeSection}>
              <Text style={[styles.themeSectionTitle, { color: theme.colors.mutedForeground }]}>
                LIGHT THEMES
              </Text>
              {Object.values(LIGHT_THEME_PRESETS).map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.themeCard,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
                  ]}
                  onPress={() => {
                    theme.setLightTheme(preset.id as any);
                  }}
                >
                  <View style={[styles.colorPreview, {
                    backgroundColor: preset.colors.card,
                    borderColor: theme.isDark ? '#999999' : theme.colors.border,
                    borderWidth: 2.5,
                  }]}>
                    <View style={[styles.colorPreviewInner, {
                      backgroundColor: preset.colors.background
                    }]} />
                  </View>
                  <View style={styles.themeOptionText}>
                    <Text style={[styles.themeOptionTitle, { color: theme.colors.foreground }]}>
                      {preset.name}
                    </Text>
                    <Text style={[styles.themeOptionSubtitle, { color: theme.colors.mutedForeground }]}>
                      {preset.description}
                    </Text>
                  </View>
                  {theme.lightTheme === preset.id && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Dark Themes Section */}
            <View style={[styles.themeSection, styles.themeSectionLast]}>
              <Text style={[styles.themeSectionTitle, { color: theme.colors.mutedForeground }]}>
                DARK THEMES
              </Text>
              {Object.values(DARK_THEME_PRESETS).map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.themeCard,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
                  ]}
                  onPress={() => {
                    theme.setDarkTheme(preset.id as any);
                  }}
                >
                  <View style={[styles.colorPreview, {
                    backgroundColor: preset.colors.card,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                  }]}>
                    <View style={[styles.colorPreviewInner, {
                      backgroundColor: preset.colors.background
                    }]} />
                  </View>
                  <View style={styles.themeOptionText}>
                    <Text style={[styles.themeOptionTitle, { color: theme.colors.foreground }]}>
                      {preset.name}
                    </Text>
                    <Text style={[styles.themeOptionSubtitle, { color: theme.colors.mutedForeground }]}>
                      {preset.description}
                    </Text>
                  </View>
                  {theme.darkTheme === preset.id && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </BottomSheetScrollView>
        </View>
      </BottomSheetModal>

      {/* Security Information Bottom Sheet */}
      <BottomSheetModal
        ref={securitySheetRef}
        snapPoints={securitySnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        topInset={45}
        enableDynamicSizing={false}
      >
        <View style={{ paddingBottom: 32 }}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.foreground }]}>
              Security & Privacy
            </Text>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.muted }]}
              onPress={() => securitySheetRef.current?.dismiss()}
            >
              <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <BottomSheetScrollView style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <View style={{ gap: 20, paddingBottom: 20 }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="lock-closed" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.securityFeatureTitle, { color: theme.colors.foreground }]}>
                    Zero-Knowledge Encryption
                  </Text>
                </View>
                <Text style={[styles.securityFeatureDescription, { color: theme.colors.mutedForeground }]}>
                  Your notes are encrypted with AES-256 encryption using your master password. We never have access to your decryption key or unencrypted data.
                </Text>
              </View>

              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="key" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.securityFeatureTitle, { color: theme.colors.foreground }]}>
                    Master Password
                  </Text>
                </View>
                <Text style={[styles.securityFeatureDescription, { color: theme.colors.mutedForeground }]}>
                  {`Your master password is the only key to decrypt your notes. It's never stored on our servers and cannot be recovered if lost.`}
                </Text>
              </View>

              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.securityFeatureTitle, { color: theme.colors.foreground }]}>
                    End-to-End Protection
                  </Text>
                </View>
                <Text style={[styles.securityFeatureDescription, { color: theme.colors.mutedForeground }]}>
                  All encryption and decryption happens on your device. Your data is encrypted before it leaves your device and stays encrypted on our servers.
                </Text>
              </View>

              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="eye-off" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.securityFeatureTitle, { color: theme.colors.foreground }]}>
                    Complete Privacy
                  </Text>
                </View>
                <Text style={[styles.securityFeatureDescription, { color: theme.colors.mutedForeground }]}>
                  {`We can't read your notes, recover your password, or access your data. Your privacy is guaranteed by design.`}
                </Text>
              </View>
            </View>
          </BottomSheetScrollView>
        </View>
      </BottomSheetModal>

      {/* View Mode Selection Bottom Sheet */}
      <BottomSheetModal
        ref={viewModeSheetRef}
        snapPoints={viewModeSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        topInset={45}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
      >
        <BottomSheetView>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.foreground }]}>
              View Mode
            </Text>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.muted }]}
              onPress={() => viewModeSheetRef.current?.dismiss()}
            >
              <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.bottomSheetContent, { paddingTop: 16 }]}>
            {[
              { mode: 'list', title: 'List', subtitle: 'View items in a list', icon: 'list-outline' },
              { mode: 'grid', title: 'Grid', subtitle: 'View items in a grid', icon: 'grid-outline' }
            ].map((option) => (
              <TouchableOpacity
                key={option.mode}
                style={[styles.optionItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => {
                  saveViewMode(option.mode as 'list' | 'grid');
                  viewModeSheetRef.current?.dismiss();
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: theme.colors.muted }]}>
                  <Ionicons name={option.icon as any} size={20} color={theme.colors.foreground} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: theme.colors.mutedForeground }]}>
                    {option.subtitle}
                  </Text>
                </View>
                {viewMode === option.mode && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Usage Bottom Sheet */}
      <UsageBottomSheet sheetRef={usageSheetRef} snapPoints={usageSnapPoints} />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    minHeight: 44,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    textAlign: 'left',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 34,
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionsContainer: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  firstSection: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  firstSectionTitle: {
    paddingTop: 8,
    marginTop: 0,
  },
  settingCardContainer: {
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingItemText: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingItemSubtitle: {
    fontSize: 14,
  },
  settingItemRight: {
    marginLeft: 12,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  // Bottom sheet modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  bottomSheetHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
  },
  divider: {
    height: 0.5,
  },
  bottomSheetScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    marginBottom: 1,
  },
  themeOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  themeOptionText: {
    flex: 1,
  },
  themeOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  themeOptionSubtitle: {
    fontSize: 13,
  },
  securityFeatureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  securityFeatureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  lastThemeOption: {
    borderBottomWidth: 0,
  },
  colorPreview: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPreviewInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  themeSection: {
    marginBottom: 24,
  },
  themeSectionLast: {
    marginBottom: 32,
  },
  themeSectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },
});