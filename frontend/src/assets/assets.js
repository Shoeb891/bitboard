import { Home, UserIcon } from 'lucide-react'



export const assets = {
    
}

export const menuItemsData = [
    {to: '/', label: 'Bitboard', Icon: Home},
    {to: '/profile', label: 'Profile', Icon: UserIcon},

]

export const dummyUserData = {
    "-_id": "user_2zdFoZib5lNr614LgkOND8WG32",
    "email": "admin@example.com",
    "full_name": "jeffery_Owns",
    "username": "jeffery_owns",
    "bio": "Pixel artist of the year",
    "profile_picture": sample_profile,
    "cover_photo": sample_cover,
    "location": "New york, NY",
    "followers": ["user_2", "user_3"],
    "following": ["user_2", "user_3"],
    "posts": [],
    "createdAt": "2023-09-08",
}
const dummyUser2Data = {
    ...dummyUserData,
    _id: "user_2",
    username: "Ricky handly",
    full_name: "Ricky handly,",
    profile_picture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200",
}
const dummyUser3Data = {
    ...dummyUserData,
    _id: "user_3",
    username: "Pronly handly",
    full_name: "Pronly handly,",
    profile_picture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200",
}

export const dummyStoriesData = [
    {
        "_id": "g5hg5h6jhjrthesrghhh6h6h",
        "user": dummyUserData,
        "content":"this story is of the pixel wars",
        "background_color": "#4f46e5",
        "createdAt": "2023-09-08"
    }
]