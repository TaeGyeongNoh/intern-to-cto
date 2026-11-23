import type { ComponentType, ReactNode } from 'react';
import {
  Activity as LActivity,
  AppWindow as LAppWindow,
  Boxes as LBoxes,
  Cpu as LCpu,
  Database as LDatabase,
  ScrollText as LScrollText,
  Server as LServer,
  Workflow as LWorkflow,
  ArrowDown as LArrowDown,
  ArrowRight as LArrowRight,
  ArrowUp as LArrowUp,
  Bot as LBot,
  BrainCircuit as LBrainCircuit,
  Calendar as LCalendar,
  Camera as LCamera,
  ChevronLeft as LChevronLeft,
  ChevronRight as LChevronRight,
  ChevronUp as LChevronUp,
  CircleCheck as LCircleCheck,
  CircleX as LCircleX,
  ClipboardList as LClipboardList,
  CornerDownRight as LCornerDownRight,
  Dices as LDices,
  Dot as LDot,
  Download as LDownload,
  EyeOff as LEyeOff,
  FileText as LFileText,
  Flag as LFlag,
  Flame as LFlame,
  House as LHouse,
  Inbox as LInbox,
  Landmark as LLandmark,
  LifeBuoy as LLifeBuoy,
  Link as LLink,
  Lock as LLock,
  LogOut as LLogOut,
  Megaphone as LMegaphone,
  MessageCircle as LMessageCircle,
  Minus as LMinus,
  Palette as LPalette,
  Plane as LPlane,
  Play as LPlay,
  Puzzle as LPuzzle,
  Rocket as LRocket,
  RotateCcw as LRotateCcw,
  Search as LSearch,
  ServerCog as LServerCog,
  ShoppingCart as LShoppingCart,
  Siren as LSiren,
  Sparkles as LSparkles,
  TrendingDown as LTrendingDown,
  TrendingUp as LTrendingUp,
  TriangleAlert as LTriangleAlert,
  UserRoundX as LUserRoundX,
  Wallet as LWallet,
  Wrench as LWrench,
  X as LX,
  Award as LAward,
  Coins as LCoins,
  GraduationCap as LGraduationCap,
  KeyRound as LKeyRound,
  Keyboard as LKeyboard,
  PiggyBank as LPiggyBank,
  Store as LStore,
  TreePalm as LTreePalm,
  Handshake as LHandshake,
  FilePenLine as LFilePenLine,
  Ticket as LTicket,
  Building2 as LBuilding2,
  School as LSchool,
  FlaskConical as LFlaskConical,
  Shuffle as LShuffle,
  Shield as LShield,
  Factory as LFactory,
  Microscope as LMicroscope,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import s from './Icons.module.css';

/** 아이콘 룩은 여기 한 곳에서만 조절한다. 색은 currentColor를 따른다. */
const DEFAULTS = { size: 16, strokeWidth: 1.75, absoluteStrokeWidth: false } as const;

export type IconProps = LucideProps;
export type IconType = ComponentType<IconProps>;

function make(Base: LucideIcon, name: string): IconType {
  const C = ({ className, ...p }: IconProps) => (
    <Base aria-hidden {...DEFAULTS} {...p} className={className ? `${s.icon} ${className}` : s.icon} />
  );
  C.displayName = name;
  return C;
}

export const Activity = make(LActivity, 'Activity');
export const AppWindow = make(LAppWindow, 'AppWindow');
export const Boxes = make(LBoxes, 'Boxes');
export const Cpu = make(LCpu, 'Cpu');
export const Database = make(LDatabase, 'Database');
export const ScrollText = make(LScrollText, 'ScrollText');
export const Server = make(LServer, 'Server');
export const Workflow = make(LWorkflow, 'Workflow');
export const ArrowDown = make(LArrowDown, 'ArrowDown');
export const ArrowRight = make(LArrowRight, 'ArrowRight');
export const ArrowUp = make(LArrowUp, 'ArrowUp');
export const Bot = make(LBot, 'Bot');
export const BrainCircuit = make(LBrainCircuit, 'BrainCircuit');
export const Calendar = make(LCalendar, 'Calendar');
export const Camera = make(LCamera, 'Camera');
export const ChevronLeft = make(LChevronLeft, 'ChevronLeft');
export const ChevronRight = make(LChevronRight, 'ChevronRight');
export const ChevronUp = make(LChevronUp, 'ChevronUp');
export const CircleCheck = make(LCircleCheck, 'CircleCheck');
export const CircleX = make(LCircleX, 'CircleX');
export const ClipboardList = make(LClipboardList, 'ClipboardList');
export const CornerDownRight = make(LCornerDownRight, 'CornerDownRight');
export const Dices = make(LDices, 'Dices');
export const Dot = make(LDot, 'Dot');
export const Download = make(LDownload, 'Download');
export const EyeOff = make(LEyeOff, 'EyeOff');
export const FileText = make(LFileText, 'FileText');
export const Flag = make(LFlag, 'Flag');
export const Flame = make(LFlame, 'Flame');
export const House = make(LHouse, 'House');
export const Inbox = make(LInbox, 'Inbox');
export const Landmark = make(LLandmark, 'Landmark');
export const Link = make(LLink, 'Link');
export const LifeBuoy = make(LLifeBuoy, 'LifeBuoy');
export const Lock = make(LLock, 'Lock');
export const LogOut = make(LLogOut, 'LogOut');
export const Megaphone = make(LMegaphone, 'Megaphone');
export const MessageCircle = make(LMessageCircle, 'MessageCircle');
export const Minus = make(LMinus, 'Minus');
export const Palette = make(LPalette, 'Palette');
export const Plane = make(LPlane, 'Plane');
export const Play = make(LPlay, 'Play');
export const Puzzle = make(LPuzzle, 'Puzzle');
export const Rocket = make(LRocket, 'Rocket');
export const RotateCcw = make(LRotateCcw, 'RotateCcw');
export const Search = make(LSearch, 'Search');
export const ServerCog = make(LServerCog, 'ServerCog');
export const ShoppingCart = make(LShoppingCart, 'ShoppingCart');
export const Siren = make(LSiren, 'Siren');
export const Sparkles = make(LSparkles, 'Sparkles');
export const TrendingDown = make(LTrendingDown, 'TrendingDown');
export const TrendingUp = make(LTrendingUp, 'TrendingUp');
export const TriangleAlert = make(LTriangleAlert, 'TriangleAlert');
export const UserRoundX = make(LUserRoundX, 'UserRoundX');
export const Wallet = make(LWallet, 'Wallet');
export const Wrench = make(LWrench, 'Wrench');
export const X = make(LX, 'X');
export const Award = make(LAward, 'Award');
export const Coins = make(LCoins, 'Coins');
export const GraduationCap = make(LGraduationCap, 'GraduationCap');
export const KeyRound = make(LKeyRound, 'KeyRound');
export const Keyboard = make(LKeyboard, 'Keyboard');
export const PiggyBank = make(LPiggyBank, 'PiggyBank');
export const Store = make(LStore, 'Store');
export const TreePalm = make(LTreePalm, 'TreePalm');
export const Handshake = make(LHandshake, 'Handshake');
export const FilePenLine = make(LFilePenLine, 'FilePenLine');
export const Ticket = make(LTicket, 'Ticket');
export const Building2 = make(LBuilding2, 'Building2');
export const School = make(LSchool, 'School');
export const FlaskConical = make(LFlaskConical, 'FlaskConical');
export const Shuffle = make(LShuffle, 'Shuffle');
export const Shield = make(LShield, 'Shield');
export const Factory = make(LFactory, 'Factory');
export const Microscope = make(LMicroscope, 'Microscope');

export type IconTone = 'muted' | 'primary' | 'good' | 'warning' | 'critical' | 'inherit';

/** 아이콘 + 글자를 한 줄로 가운데 정렬. 장식 아이콘은 기본 muted. */
export function IconText({ icon: I, tone = 'muted', size, children, className }: {
  icon: IconType;
  tone?: IconTone;
  size?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={className ? `${s.iconText} ${className}` : s.iconText}>
      <I size={size} className={s[tone]} />
      <span>{children}</span>
    </span>
  );
}
