// src/app/api/friends/block/route.ts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      )
    }

    // التحقق من وجود المستخدم
    const userToBlock = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!userToBlock) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      )
    }

    // البحث عن أي علاقة صداقة موجودة
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: session.user.id, user2Id: userId },
          { user1Id: userId, user2Id: session.user.id }
        ]
      }
    })

    if (existingFriendship) {
      // تحديث حالة الصداقة إلى محظور
      await prisma.friendship.update({
        where: { id: existingFriendship.id },
        data: { status: 'BLOCKED' }
      })
    } else {
      // إنشاء علاقة محظورة جديدة
      await prisma.friendship.create({
        data: {
          user1Id: session.user.id,
          user2Id: userId,
          status: 'BLOCKED'
        }
      })
    }

    return NextResponse.json({
      message: 'تم حظر المستخدم بنجاح'
    }, { status: 200 })

  } catch (error) {
    console.error('Block user error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حظر المستخدم' },
      { status: 500 }
    )
  }
}
