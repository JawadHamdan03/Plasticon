import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { WorkerTabParamList } from './types';
import { PlaceholderScreen } from '../screens/shared/PlaceholderScreen';

// Screens (swapped in as each phase completes)
const Hub        = () => <PlaceholderScreen title="Worker Hub"   icon="grid"                  />;
const Production = () => <PlaceholderScreen title="Production"   icon="cube-outline"           />;
const Attendance = () => <PlaceholderScreen title="Attendance"   icon="time-outline"           />;
const Assistant  = () => <PlaceholderScreen title="AI Assistant" icon="chatbubble-ellipses-outline" />;
const Profile    = () => <PlaceholderScreen title="Profile"      icon="person-outline"         />;

const Tab = createBottomTabNavigator<WorkerTabParamList>();

export function WorkerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, [string, string]> = {
            Hub:        ['grid',                       'grid-outline'],
            Production: ['cube',                       'cube-outline'],
            Attendance: ['time',                       'time-outline'],
            Assistant:  ['chatbubble-ellipses',        'chatbubble-ellipses-outline'],
            Profile:    ['person',                     'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Hub"        component={Hub}        options={{ tabBarLabel: 'Hub' }}        />
      <Tab.Screen name="Production" component={Production} options={{ tabBarLabel: 'Production' }} />
      <Tab.Screen name="Attendance" component={Attendance} options={{ tabBarLabel: 'Attendance' }} />
      <Tab.Screen name="Assistant"  component={Assistant}  options={{ tabBarLabel: 'AI Chat' }}    />
      <Tab.Screen name="Profile"    component={Profile}    options={{ tabBarLabel: 'Profile' }}    />
    </Tab.Navigator>
  );
}
