import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList, Modal, Pressable,
  Text,
  TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  cityFromZoneId,
  dayRelative,
  deviceZone,
  diffLabel,
  getAllZones,
  timeHHmm,
} from '../../helpers/timezones';

import type { SavedIanaIds } from '../../utils/types';

const STORAGE_KEY = '@worldclocks';

export default function ClocksScreen() {
  const [now, setNow] = useState(new Date());
  const [zones, setZones] = useState<SavedIanaIds>([deviceZone()]);
  const [open, setOpen] = useState(false); // for modal visibility
  const [query, setQuery] = useState(''); // search query

  // load saved on mount
  useEffect(() => {
    (async () => {
      // raw gets stringified array of ids or null from storage
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          setZones(JSON.parse(raw));
        } catch {}
      } else {
        // first run, add device zone
        setZones([deviceZone()]);
      }
    })();
  }, []);

  // save on change
  useEffect(() => {
    // save zones as stringified array of ids to async storage
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(zones)).catch(() => {
    });
  }, [zones]);

  // tick every minute
  useEffect(() => {
    // update every minute to keep times accurate
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // all available zones, useMemo to avoid recalculating
  const all = useMemo(() => getAllZones(), []); 
  // useMemo so filtering only runs when query or all changes
  const filtered = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) return all;
    return all.filter(zone =>
      zone.id.toLowerCase().includes(searchTerm) ||
      zone.city.toLowerCase().includes(searchTerm) ||
      (zone.country ?? '').toLowerCase().includes(searchTerm)
    );
  }, [query, all]);

  function addZone(id: string) {
    //if zone already added, do nothing
    //else add to list
    setZones(prev => (prev.includes(id) ? prev : [...prev, id])); 
    setQuery('');
    setOpen(false);
  }

  function removeZone(id: string) {
    Alert.alert('Remove clock', `Remove ${id}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setZones(prev => prev.filter(z => z !== id)) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1">
      {/* header */}
      <View className="px-4 py-4 flex-row items-center justify-between">
        <Text className="text-4xl font-semibold text-white">World Clocks</Text>
        <Pressable
          onPress={() => setOpen(true)}
          className="px-3 py-2 rounded-xl border border-neutral-300 active:opacity-70"
        >
          <Text className="font-medium text-xl text-white">+ Add</Text>
        </Pressable>
      </View>

      {/* list of saved clocks */}
      <FlatList
      className='pb-24'
        data={zones}
        keyExtractor={(id) => id}
        ItemSeparatorComponent={() => <View className="h-[1px] bg-neutral-200/60" />}
        renderItem={({ item: id }) => {
          const city = cityFromZoneId(id);
          const timeDiffLabel = diffLabel(id, now);
          const day = dayRelative(id, now);
          const time = timeHHmm(id, now);

          return (
            <Pressable
              onLongPress={() => removeZone(id)}
              className="px-4 py-3 flex-row items-center justify-between"
            >
              <View className="flex-col">
                <Text className="text-2xl font-semibold text-white">{city}</Text>
              </View>
              <View className="items-end">
                <Text className="text-2xl font-bold tabular-nums text-white">{time}</Text>
                <Text className="text-lg text-neutral-500">{timeDiffLabel} • {day}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-24">
            <Text className="text-2xl text-neutral-500">No clocks yet. Tap “Add”.</Text>
          </View>
        }
      />

      {/* Add modal */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-black">
          {/* header */}
          <View className="px-4 py-4 flex-row items-center justify-between">
            <Text className="text-white text-2xl font-semibold">Add a Clock</Text>
            <Pressable onPress={() => setOpen(false)} className="px-2 py-1">
              <Text className="text-blue-400 text-xl">Done</Text>
            </Pressable>
          </View>

          {/* search box */}
          <View className="px-4 pb-2">
            <TextInput
              placeholder="Search city, country, or zone id"
              value={query}
              onChangeText={setQuery}
              className="border border-neutral-300 rounded-xl px-3 py-4 placeholder:text-white/70"
            />
          </View>

          {/* list of zones */}
          <FlatList
            data={filtered}
            keyExtractor={(zone) => zone.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => addZone(item.id)}
                className="px-4 py-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-white font-medium text-xl">{item.city}</Text>
                  <Text className="text-lg text-neutral-400">
                    {item.country ? `${item.country} • ${item.id}` : item.id}
                  </Text>
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View className="h-[1px] bg-neutral-200/70" />}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
