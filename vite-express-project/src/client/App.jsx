import { useEffect, useState } from "react";
import Header from "./Header.jsx";
import Form from "./Form.jsx";
import List from "./List.jsx";

const emptyForm = {
    assignment: "",
    category: "",
    deadline: "",
};

function App() {
    const [assignments, setAssignments] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [isEditing, setIsEditing] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                const response = await fetch("/docs");
                if (response.status === 401){
                    window.location.replace("/login.html");
                    return;
                }
                 setAssignments(await response.json());


            } catch (error){
                alert(error.message);
            }
        }
        load();
    }, []);

    function handleInputChange(event) {
        const { name, value } = event.target;

        setForm(current => ({
            ...current,
            [name]: value,
        }));
    }
    async function handleSubmit(event) {
        event.preventDefault();
        const editing = isEditing !== null;
        const data = editing ? { ...form, _id: isEditing } : form;
        const url = editing ? "/update" : "/add";
        const body = JSON.stringify(data);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body,
        });
        setAssignments(await response.json())
        setForm(emptyForm);
        setIsEditing(null);
    }
    async function deleteTask(id) {
        const response = await fetch("/remove", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                _id: id,
            }),
        });
        setAssignments(await response.json());
    }

    function editTask(item) {
        setIsEditing(item._id);
        setForm({
            assignment: item.assignment,
            category: item.category,
            deadline: item.deadline,
        });
    }

    async function logout() {
        try {
            const response = await fetch("/logout", {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Could not log out.");
            }

            window.location.href = "/login.html";
        } catch (error) {
            alert(error.message);
        }
    }
    return (
        <>
            <Header logout={logout} />
            <Form form={form} isEditing={isEditing} handleInputChange={handleInputChange} onSubmit={handleSubmit} />
            <List assignments={assignments} isEditing={isEditing} onEdit={editTask} onDelete={deleteTask} />
        </>
    );
}
export default App;
