from flask import Flask, render_template, redirect, url_for, request, flash
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
from forms import LoginForm, RegisterForm
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin, login_user, LoginManager, login_required, current_user, logout_user
from sqlalchemy.orm import relationship
from datetime import datetime
import os

app = Flask(__name__)

# app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tasks.db'

# app.config['SECRET_KEY'] = '2ae76b45748f51c2d730af17b02d2d79fd43c200b8d7dd48a5ef9c67152891bc'
app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY")

uri = os.environ.get("DATABASE_URL",  "sqlite:///blog.db")  # or other relevant config var
if uri.startswith("postgres://"):
    uri = uri.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


##CONFIGURE TABLE
class User(UserMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(100))
    name = db.Column(db.String(100))
    tasklists = relationship("TaskList", back_populates="author")


class TaskList(db.Model):
    __tablename__ = "task_lists"
    uid = db.Column(db.String(100), primary_key=True)
    author_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    author = relationship("User", back_populates="tasklists")
    name = db.Column(db.String(500), nullable=False)
    tasks = relationship("Task", back_populates="list")
    tasklist_priority = db.Column(db.Integer, nullable=False)


class Task(db.Model):
    __tablename__ = "tasks"
    task_id = db.Column(db.Integer, primary_key=True)
    task_list_id = db.Column(db.String, db.ForeignKey("task_lists.uid"))
    list = relationship("TaskList", back_populates="tasks")
    data = db.Column(db.String(500), nullable=False)
    starred = db.Column(db.Boolean, nullable=False)
    color = db.Column(db.String(20), nullable=False)
    task_priority = db.Column(db.Integer, nullable=False)
    date = db.Column(db.DateTime)
    complete = db.Column(db.Boolean, nullable=False)


db.create_all()


@app.route("/register", methods=["POST"])
def register():
    form = RegisterForm()

    if form.validate_on_submit():

        if User.query.filter_by(email=form.email.data).first():
            print(User.query.filter_by(email=form.email.data).first())
            # User already exists
            flash("You've already signed up with that email, log in instead!")
            return redirect(url_for("task_list", tasklist_id=form.tasklist_id.data))

        hash_and_salted_password = generate_password_hash(
            form.password.data,
            method='pbkdf2:sha256',
            salt_length=8
        )
        new_user = User(
            email=form.email.data,
            name=form.name.data,
            password=hash_and_salted_password,
        )
        db.session.add(new_user)
        db.session.commit()
        login_user(new_user)
        return redirect(url_for("home", tasklist_id=form.tasklist_id.data))
    print(form.errors)
    return render_template("register.html", form=form, current_user=current_user)


@app.route('/login', methods=["GET", "POST"])
def login():
    form = LoginForm()
    print(form)
    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data
        print("valid")
        user = User.query.filter_by(email=email).first()
        # Email doesn't exist or password incorrect.
        if not user:
            flash("That email does not exist, please try again.")
            return redirect(url_for('login11'))
        elif not check_password_hash(user.password, password):
            flash('Password incorrect, please try again.')
            return redirect(url_for('login11'))
        else:
            login_user(user)
            return redirect(url_for("home"))
    print(form.errors)
    return render_template("login.html", form=form, current_user=current_user)


@app.route('/logout')
def logout():
    print("logging out")
    logout_user()
    return redirect(url_for("new"))


@app.route("/")
def home():
    if not current_user.is_authenticated:
        return redirect(url_for("new"))
    else:
        if len(current_user.tasklists) == 0:
            return redirect(url_for("new"))
        else:
            current_user.tasklists.sort(key=lambda x: x.tasklist_priority)
            for tl in current_user.tasklists:
                tl.tasks.sort(key=lambda x: x.task_priority, reverse=True)
            current_user.tasklists.reverse()
        return render_template("user-view.html", current_user=current_user)


@app.route("/new")
def new():
    code = str(uuid.uuid4())
    if current_user.is_authenticated:
        max_priority = max(x.tasklist_priority for x in current_user.tasklists)
        tasklist = TaskList(uid=code, name="New List", author_id=current_user.id, tasklist_priority=max_priority + 1)
    else:
        tasklist = TaskList(uid=code, name="New List", tasklist_priority=0)
    db.session.add(tasklist)
    db.session.commit()
    new_tasklist_id = tasklist.uid
    if current_user.is_authenticated:
        return redirect(url_for("home"))
    else:
        return redirect(f"/{new_tasklist_id}")


@app.route("/<tasklist_id>")
def task_list(tasklist_id):
    tasklist = TaskList.query.get(tasklist_id)
    tasklist.tasks.sort(key=lambda x: x.task_priority, reverse=True)
    return render_template("user-view.html", tasklist=tasklist, registrationForm=RegisterForm(), loginForm=LoginForm())


@app.route("/add_task", methods=["POST"])
def new_task():
    if request.method == 'POST':
        task_priority = int(request.form['highest_priority']) + 1
        new_task = Task(data=request.form['data'], starred=False, task_priority=task_priority,
                        task_list_id=request.form['tasklist_id'], color="FFFFFF", complete=False)
        db.session.add(new_task)
        db.session.commit()
        data = [new_task.task_id, request.form['tasklist_id'], request.form['data'], False, False]
        return render_template("li-template.html", data=new_task)
    return


@app.route("/star_task", methods=["POST"])
def star_task():
    if request.method == 'POST':
        conversion = {"true": 1, "false": 0}
        starred = conversion[request.form["star"]]
        task = Task.query.get(request.form["task_id"])
        task.starred = starred
        db.session.commit()
    return "";


@app.route("/mark_complete_task", methods=["POST"])
def mark_complete_task():
    if request.method == 'POST':
        conversion = {"true": 1, "false": 0}
        completed = conversion[request.form["complete"]]
        task = Task.query.get(request.form["task_id"])
        task.complete = completed
        db.session.commit()
    return "";


@app.route("/reorder_tasks", methods=["POST"])
def reorder_task():
    if request.method == 'POST':
        new_series = list(map(int, request.form["new_order"].split(",")))
        new_series.reverse()
        for x in range(len(new_series)):
            task = Task.query.get(new_series[x])
            task.task_priority = x
        db.session.commit()
    return "";


@app.route("/reorder_tasklists", methods=["POST"])
def reorder_tasklists():
    if request.method == 'POST':
        new_series = request.form["new_order"].split(",")
        new_series.reverse()
        for x in range(len(new_series)):
            tasklist = TaskList.query.get(new_series[x])
            tasklist.tasklist_priority = x
        db.session.commit()
    return "";


@app.route("/update_task", methods=["POST"])
def update_task():
    if request.method == 'POST':
        print("Updating", request.form["task_id"], request.form["text"])
        task = Task.query.get(request.form["task_id"])
        task.data = request.form["text"]
        db.session.commit()
    return "";


@app.route("/update_tasklist_name", methods=["POST"])
def update_tasklist_name():
    if request.method == 'POST':
        print("updating name")
        tasklist = TaskList.query.get(request.form["tasklist_id"])
        tasklist.name = request.form["new_name"]
        db.session.commit()
    return "";


@app.route("/color_task", methods=["POST"])
def color_task():
    if request.method == 'POST':
        task = Task.query.get(request.form["task_id"])
        task.color = request.form["color"]
        db.session.commit()
    return "";


@app.route("/delete_task", methods=["POST"])
def delete_task():
    if request.method == 'POST':
        task = Task.query.get(request.form["task_id"])
        db.session.delete(task)
        db.session.commit()
    return "";


@app.route("/edit_date", methods=["POST"])
def edit_date():
    if request.method == 'POST':
        date = request.form["date"]
        if date != "":
            new_date = datetime.strptime(date, "%d/%m/%Y")
        else:
            new_date = None
        task = Task.query.get(request.form["task_id"])
        task.date = new_date
        db.session.commit()
    return "";

@app.route("/delete_tasklist/<uid>", methods=["POST","GET"])
def delete_tasklist(uid):
    if request.method == 'GET':
        tasklist = TaskList.query.get(uid)
        for t in tasklist.tasks:
            db.session.delete(t)
        db.session.delete(tasklist)
        db.session.commit()
    return redirect(url_for("home"))

if __name__ == "__main__":
    app.run(debug=True)
