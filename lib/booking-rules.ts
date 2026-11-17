import type { BookingStatus } from "./types";

export const ACTIVE_STATUSES = new Set<BookingStatus>(["PENDING_ADMIN","AWAITING_PAYMENT","PAYMENT_REVIEW","CONFIRMED","COMPLETED"]);
export type RuleBooking={id:string;memberId:string;themeId:string;status:BookingStatus};
export type RuleDate={capacity:number;themeId:string|null;lockedByAdmin:boolean;isOpen:boolean;bookings:RuleBooking[]};

export function activeBookings(date:RuleDate){return date.bookings.filter(b=>ACTIVE_STATUSES.has(b.status));}
export function canBook(date:RuleDate,memberId:string,themeId:string){
  if(!date.isOpen)return {ok:false,code:"DATE_UNAVAILABLE"} as const;
  const active=activeBookings(date);
  if(date.themeId&&date.themeId!==themeId)return {ok:false,code:"THEME_MISMATCH"} as const;
  if(active.length>=date.capacity)return {ok:false,code:"CLASS_FULL"} as const;
  if(active.some(b=>b.memberId===memberId))return {ok:false,code:"ALREADY_BOOKED"} as const;
  return {ok:true,code:"OK"} as const;
}
export function book(date:RuleDate,booking:RuleBooking){const result=canBook(date,booking.memberId,booking.themeId);if(!result.ok)return result;date.themeId??=booking.themeId;date.bookings.push(booking);return result;}
export function cancel(date:RuleDate,id:string){const b=date.bookings.find(x=>x.id===id);if(!b)return false;b.status="CANCELLED";if(activeBookings(date).length===0&&!date.lockedByAdmin)date.themeId=null;return true;}
export function changeCapacity(date:RuleDate,capacity:number){if(capacity<activeBookings(date).length)return {ok:false,code:"CAPACITY_BELOW_ACTIVE_BOOKINGS"} as const;date.capacity=capacity;return {ok:true,code:"OK"} as const;}
export function changeTheme(date:RuleDate,themeId:string|null){if(activeBookings(date).length>0&&themeId!==date.themeId)return {ok:false,code:"THEME_HAS_ACTIVE_BOOKINGS"} as const;date.themeId=themeId;return {ok:true,code:"OK"} as const;}
