import { SearchBox } from 'react-instantsearch'

export default function Header() {
  return (
    <header className="header">
      <div className="header__logo">
        <span className="header__logo-icon">⚡</span>
        <span className="header__logo-text">ElectroSearch</span>
      </div>
      <div className="header__search">
        <SearchBox placeholder="Search electronics…" />
      </div>
    </header>
  )
}
