function Header({logout}){

    return(
        <header className="page-header">
            <h1>Assignment Tracker</h1>
            <button type="button" id="logout" onClick={logout}>Logout</button>
        </header>
    );
}

export default Header