import { elt, render, usePromise, useValue, type ValueState } from "./elt";
import { Navbar } from "./Navbar";
import type { RouteProps } from "./router";
import { randi, sleep } from "./utils";

interface PostData {
  id: string;
  username: string;
  body: string;
}
type NewPost = Omit<PostData, 'id'>;

const POSTS = [
  { id: crypto.randomUUID(), username: 'Meliodas', body: 'Visit the Hog Inn for great beer!' },
  { id: crypto.randomUUID(), username: 'Buefido', body: 'Mis musculos estan creciendo musculos!' },
  { id: crypto.randomUUID(), username: 'Mai', body: 'Caminar mientras esta fresco cae bien de vez en cuando' },
  { id: crypto.randomUUID(), username: 'jmnuf', body: 'El verano es la mejor temporada' },
];

{
  const savedPostsString = localStorage.getItem('Feed:Posts');
  if (savedPostsString) {
    const savedPosts = JSON.parse(savedPostsString) as unknown;
    if (!savedPosts || !Array.isArray(savedPosts)) {
      localStorage.setItem('Feed:Posts', JSON.stringify(POSTS));
    } else {
      POSTS.length = 0;
      for (const item of savedPosts) { POSTS.push(item); }
    } // end if array
  } // end if is truthy
}

const simPostFetch = async (postId: string) => {
  await sleep(randi(2, 5));
  const post = POSTS.find((p) => p.id === postId);
  if (!post) { throw new Error('Not Found'); }
  return post;
};

const simAllPostFetch = async () => {
  await sleep(1);
  return POSTS.slice().map((p) => p.id).reverse();
};

const simNewPost = async (postData: NewPost) => {
  console.log('Posted: ', postData);
  await sleep(10);
  let newId = crypto.randomUUID();
  while (POSTS.findIndex((p) => p.id == newId) !== -1) newId = crypto.randomUUID();
  const post = {
    ...postData,
    id: newId,
  };
  POSTS.push(post);
  localStorage.setItem('Feed:Posts', JSON.stringify(POSTS));

  return post;
};

interface FeedProps extends RouteProps {
}

export function Feed(props: FeedProps) {
  let container: HTMLElement;
  let newPostRefs = useValue({ message: undefined as HTMLTextAreaElement | undefined, username: undefined as HTMLInputElement | undefined });
  const postIds = useValue([] as string[]);
  const cachedPosts = {} as Record<string, Node | undefined>;
  let newPostData: PostData | null = null;

  const onNewPostReq = async (data: NewPost) => {
    container.insertBefore(NewPostPreview({ data }), container.firstChild);
    const newPost = await simNewPost(data);
    newPostData = newPost;
    postIds.update((ids) => [newPost.id, ...ids]);
  };

  const request = usePromise(simAllPostFetch());
  request.sub((state) => {
    if (state.status === 'loading') {
      container.innerText = 'Loading...';
      return;
    }
    container.classList.remove('animate-pulse');
    if (state.status === 'failed') {
      console.log(state.error);
      container.innerText = 'Failed: ' + state.error.message;
      return;
    }
    if (state.status === 'success') {
      postIds.setTo(state.value);
      return;
    }
  });
  postIds.sub((ids) => {
    render('#' + container.id, ({ root }) => {
      elt<HTMLElement>(root, {
        children: [
          ids.map((postId) => {
            let post = cachedPosts[postId];
            if (!post) {
              if (newPostData && newPostData.id === postId) {
                post = Post({ postId, preview: newPostData });
              } else {
                post = Post({ postId });
              }
              cachedPosts[postId] = post;
            }
            return post;
          }),
        ],
      });
    });
  });

  return elt(props.root, {
    className: 'flex flex-col gap-4',
    children: [
      Navbar,
      elt('div', {
        className: 'w-full md:w-3/4 lg:w-1/2 md:mx-auto flex justify-center items-center',
        children: [NewPostInput({ refs: newPostRefs, onNewPost: onNewPostReq })],
      }),
      elt('div', {
        id: 'feed-posts',
        set ref(v: HTMLDivElement) { container = v; },
        className: 'flex flex-col w-full md:w-3/4 lg:w-1/2 md:mx-auto justify-center items-center gap-4 animate-pulse',
        children: ['Loading...'],
      }),
    ],
  });
}

interface NewPostInputProps {
  refs: ValueState<{ message: HTMLTextAreaElement | undefined; username: HTMLInputElement | undefined; }>;
  onNewPost: (post: NewPost) => Promise<void>;
}

function NewPostInput({ refs, onNewPost }: NewPostInputProps) {
  const message = useValue('');
  const username = useValue('');
  const disabled = useValue(false);
  let textArea: HTMLTextAreaElement;
  let userInp: HTMLInputElement;
  let submitBtn: HTMLButtonElement;

  if (refs.value.message) {
    textArea = refs.value.message;
    message.setTo(textArea.value);
  } else {
    textArea = elt('textarea');
    disabled.sub((v) => {
      textArea.disabled = v;
    });
  }
  textArea.onchange = () => message.setTo(textArea.value);
  if (refs.value.username) {
    userInp = refs.value.username;
    username.setTo(textArea.value);
  } else {
    userInp = elt('input');
    disabled.sub((v) => {
      userInp.disabled = v;
    });
  }
  userInp.onchange = () => username.setTo(userInp.value);

  disabled.sub((v) => submitBtn.disabled = v);

  return elt('form', {
    className: 'w-full flex flex-col gap-2 px-2 py-1 border border-1 border-black rounded',
    onSubmit: (event) => {
      event.preventDefault();
      disabled.setTo(true);
      onNewPost({ username: username.value, body: message.value })
        .then(() => {
          message.setTo('');
          textArea.value = '';
        })
        .finally(() => disabled.setTo(false));
    },
    children: [
      elt(userInp, {
        className: 'w-full px-4 py-2 border border-1 border-black rounded',
        placeholder: '¿Cual es tu apodo?',
        value: username.value,
      }),
      elt(textArea, {
        className: 'w-full px-4 py-2 border border-1 border-black rounded',
        placeholder: '¿Qué estas pensando?',
        value: message.value,
      }),
      elt('button', {
        set ref(v: HTMLButtonElement) { submitBtn = v; },
        className: 'transition-all px-4 py-2 bg-sky-600 hover:bg-sky-400 text-slate-100 border border-1 border-sky-200 rounded',
        type: 'submit',
        innerText: 'post',
      }),
    ],
  });
}

interface PostProps {
  postId: string;
  preview?: NewPost;
}

function Post({ postId, preview }: PostProps) {
  const baseClasses = `w-full border border-2 border-gray-800 rounded px-3 py-2`;
  const request = usePromise(simPostFetch(postId));
  let container: HTMLElement;

  request.sub((state) => {
    if (state.status === 'loading') {
      container.innerHTML = '<h3>Loading post...</h3>';
      return;
    }
    container.classList.remove('animate-pulse');
    if (state.status === 'failed') {
      render('#' + container.id, ({ root }) => {
        return elt(root, {
          className: baseClasses,
          children: [
            elt('h3', { children: 'Failed to load post!' }),
            elt('p', { children: state.error.message }),
          ],
        });
      });
      console.log(state.error);
      return;
    }
    if (state.status === 'success') {
      render('#' + container.id, ({ root }) => {
        return elt(root, {
          className: baseClasses,
          children: [
            elt('h3', {
              className: 'text-sm',
              children: state.value.username + ' dice:'
            }),
            elt('p', { children: state.value.body }),
          ],
        });
      });
      return;
    }
    console.error('Unreachable: Invalid status');
  });

  if (preview) {
    return elt('article', {
      set ref(v: HTMLElement) { container = v; },
      id: 'post-' + postId,
      className: baseClasses + ' animate-pulse',
      children: [
        elt('h3', {
          className: 'text-sm',
          children: preview.username + ' dice:'
        }),
        elt('p', { children: preview.body }),
      ],
    });
  }

  return elt('article', {
    set ref(v: HTMLElement) { container = v; },
    id: 'post-' + postId,
    className: baseClasses + ' animate-pulse',
    children: [
      elt('h3', { innerText: 'Loading post...' }),
    ],
  });
}

function NewPostPreview({ data }: { data: NewPost }) {
  return elt('article', {
    className: 'w-full border border-2 border-gray-600 text-gray-600 rounded px-3 py-2 animate-pulse',
    children: [
      elt('h3', {
        className: 'text-sm',
        children: data.username + ' dice:'
      }),
      elt('p', { children: data.body }),
    ],
  });
}

