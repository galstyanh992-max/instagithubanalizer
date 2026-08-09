import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function requireJarvisOwner(): Promise<Response | null> {
  const ownerId = process.env.JARVIS_OWNER_ID?.trim();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'JARVIS не настроен: владелец системы не указан' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
  }
  if (user.id !== ownerId) {
    return NextResponse.json({ error: 'Доступ разрешён только владельцу JARVIS' }, { status: 403 });
  }
  return null;
}
