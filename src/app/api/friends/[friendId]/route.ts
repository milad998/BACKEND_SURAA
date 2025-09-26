// src/app/api/friends/[friendId]/route.ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: { friendId: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    const { friendId } = params

    // البحث عن علاقة الصداقة
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: session.user.id, user2Id: friendId },
          { user1Id: friendId, user2Id: session.user.id }
        ]
      }
    })

    if (!friendship) {
      return NextResponse.json(
        { error: 'علاقة الصداقة غير موجودة' },
        { status: 404 }
      )
    }

    // حذف علاقة الصداقة
    await prisma.friendship.delete({
      where: { id: friendship.id }
    })

    return NextResponse.json({
      message: 'تم إزالة الصديق بنجاح'
    }, { status: 200 })

  } catch (error) {
    console.error('Remove friend error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إزالة الصديق' },
      { status: 500 }
    )
  }
}
