import React from 'react';
import * as Icons from 'lucide-react';

const MAP = {
  add: Icons.Plus, 'add-circle-outline': Icons.CirclePlus, 'alert-circle': Icons.CircleAlert,
  book: Icons.BookOpen, 'book-outline': Icons.BookOpen, bookmark: Icons.Bookmark,
  'bookmark-outline': Icons.Bookmark, 'chatbubbles-outline': Icons.MessageCircle,
  checkmark: Icons.Check, 'checkmark-circle': Icons.CircleCheck, 'checkmark-done-outline': Icons.BadgeCheck,
  'chevron-back': Icons.ChevronLeft, 'chevron-down': Icons.ChevronDown,
  'chevron-forward': Icons.ChevronRight, 'chevron-up': Icons.ChevronUp,
  close: Icons.X, create: Icons.PenLine, 'create-outline': Icons.PenLine,
  'enter-outline': Icons.LogIn, flame: Icons.Flame, heart: Icons.Heart,
  'heart-outline': Icons.Heart, 'hand-left-outline': Icons.Hand,
  'hourglass-outline': Icons.Hourglass, mic: Icons.Mic, 'mic-outline': Icons.Mic,
  notifications: Icons.Bell, 'notifications-outline': Icons.Bell, pause: Icons.Pause,
  people: Icons.Users, 'people-outline': Icons.Users, play: Icons.Play,
  'pricetag-outline': Icons.Tag, search: Icons.Search, send: Icons.Send,
  'settings-outline': Icons.Settings, 'share-outline': Icons.Share2,
  stop: Icons.Square, sunny: Icons.Sun, 'sunny-outline': Icons.Sun,
  'swap-horizontal': Icons.ArrowLeftRight, sync: Icons.RefreshCw,
  'time-outline': Icons.Clock, 'trash-outline': Icons.Trash2,
};

export function Ionicons({ name, size = 20, color = 'currentColor', style }) {
  const Component = MAP[name] || Icons.Circle;
  return <Component aria-hidden="true" size={size} color={color} style={style} strokeWidth={2} />;
}
