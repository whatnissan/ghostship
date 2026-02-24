import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-800">
        <span className="text-xl font-bold text-white tracking-tight">👻 Ghost Ship</span>
        <div className="flex gap-4">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Log in</Link>
          <Link href="/signup" className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-500 transition-colors">Get Started</Link>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-block bg-violet-950 text-violet-400 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-widest uppercase border border-violet-800">
          Privacy-First Package Routing
        </div>
        <h1 className="text-6xl font-extrabold text-white mb-6 leading-tight max-w-2xl">
          Packages arrive.<br />
          <span className="text-violet-400">Your address doesn&apos;t.</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-xl mb-10 leading-relaxed">
          Share a routing code with fans and brands. They ship, you receive.
          Your real address stays completely invisible.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link href="/signup" className="bg-violet-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-violet-500 transition-colors shadow-lg shadow-violet-900">
            Create Your Code
          </Link>
          <Link href="/send" className="bg-slate-800 text-slate-200 px-8 py-3 rounded-xl font-semibold border border-slate-700 hover:bg-slate-700 transition-colors">
            Send a Package →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full text-left">
          {[
            { step: '01', title: 'Get your code', desc: 'Sign up and enter your real address once. We generate a private routing code like GHOST-4821.' },
            { step: '02', title: 'Share it publicly', desc: 'Post your code anywhere — social media, your bio, fan pages. It reveals nothing about you.' },
            { step: '03', title: 'Receive invisibly', desc: 'Fans pay for shipping and get a QR code. They drop it off at USPS. Your address is never printed until it\'s on the box.' },
          ].map(item => (
            <div key={item.step} className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="text-violet-500 font-mono text-sm font-bold mb-3">{item.step}</div>
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-6 text-slate-600 text-sm border-t border-slate-800">
        © {new Date().getFullYear()} Ghost Ship. Built for creators who value privacy.
      </footer>
    </main>
  )
}
